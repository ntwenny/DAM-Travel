import { onObjectFinalized } from "firebase-functions/storage";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions/v1";
import * as vision from "@google-cloud/vision";
import { addTripItemInternal } from "./trip";
import { TripItem, ShoppingDetectionItem } from "./types/trip";

const visionClient = new vision.ImageAnnotatorClient();

/**
 * Constructs a query string based on the provided Vision API web detection results.
 *
 * @param detections - The web detection results from the Google Cloud Vision API.
 *                      This may include best guess labels and other metadata.
 *                      If undefined or no best guess label is available, a default
 *                      query string is returned.
 * @returns A query string derived from the best guess label, or "buy product" if
 *          no suitable label is found.
 */
function buildQueryFromVision(
    detections?: vision.protos.google.cloud.vision.v1.IWebDetection
): string {
    const entities = detections?.webEntities;
    const descriptions: string[] = [];

    if (entities && entities.length > 0) {
        descriptions.push(
            ...entities
                .slice(0, 3) // Take the first 3 web entities
                .filter((e) => e.description)
                .map((e) => e.description!)
        );
    }

    const guess = detections?.bestGuessLabels?.[0]?.label?.trim();
    if (guess) {
        descriptions.push(guess); // Add the best guess label
    }

    if (descriptions.length > 0) {
        const query = descriptions.join(" ");
        logger.debug("Query from Vision WebEntities and Best Guess:", {
            query,
        });
        return query;
    }

    return "buy product"; // Default fallback query
}

/**
 * Parses a raw price string into a numeric value.
 *
 * This function removes currency symbols and other non-numeric characters,
 * while handling different decimal and thousands separators. It assumes that:
 * - If both commas (`,`) and dots (`.`) are present, commas are treated as thousands separators.
 * - If only commas are present, they are treated as decimal separators.
 * - If only dots are present, they are treated as decimal separators.
 *
 * @param raw - The raw price string to parse. If undefined, the function returns `undefined`.
 * @returns The numeric value of the price, or `undefined` if the input cannot be parsed into a finite number.
 */
function parsePriceToNumber(raw?: string): number | undefined {
    if (!raw) return undefined;
    // remove currency symbols and non-numeric except separators
    const cleaned = raw.replace(/[^\d.,-]/g, "");
    // prefer dot as decimal; if both separators exist, assume commas are thousands separators
    let canonical = cleaned;
    if (cleaned.includes(",") && cleaned.includes(".")) {
        canonical = cleaned.replace(/,/g, "");
    } else if (cleaned.includes(",") && !cleaned.includes(".")) {
        canonical = cleaned.replace(",", ".");
    }
    const num = Number(canonical);
    return Number.isFinite(num) ? num : undefined;
}

/**
 * Removes duplicate pages from a list of shopping detection items while merging relevant data.
 *
 * This function deduplicates an array of `ShoppingDetectionItem["pages"]` by normalizing the
 * `productPage` URLs (trimming, converting to lowercase, and removing query/hash parameters)
 * and ensuring only unique pages are retained. If duplicates are found, their data is merged
 * based on the following rules:
 * - Retain the name from the first occurrence, or use the name from the duplicate if missing.
 * - Retain the thumbnail from the first occurrence, or use the thumbnail from the duplicate if missing.
 * - Use the lower price between the first occurrence and the duplicate, if both prices are defined.
 * - Retain the source from the first occurrence.
 * - Merge extensions into a unique set from both the first occurrence and the duplicate.
 *
 * @param pages - An array of `ShoppingDetectionItem["pages"]` to deduplicate.
 * @returns A deduplicated array of `ShoppingDetectionItem["pages"]` with merged data for duplicates.
 */
function dedupePages(
    pages: ShoppingDetectionItem["pages"]
): ShoppingDetectionItem["pages"] {
    const seen = new Map<string, number>();
    const out: ShoppingDetectionItem["pages"] = [];
    for (const p of pages) {
        const key = (p.productPage || "")
            .trim()
            .toLowerCase()
            .replace(/[#?].*$/, "");
        if (!key) continue;
        if (!seen.has(key)) {
            seen.set(key, out.length);
            out.push(p);
        } else {
            // merge data (keep lower price, keep thumbnail if missing, merge extensions)
            const idx = seen.get(key)!;
            const prev = out[idx];
            const merged: typeof prev = {
                ...prev,
                name: prev.name || p.name,
                thumbnail: prev.thumbnail || p.thumbnail,
                extractedPrice:
                    prev.extractedPrice !== undefined &&
                    p.extractedPrice !== undefined
                        ? Math.min(prev.extractedPrice, p.extractedPrice)
                        : prev.extractedPrice ?? p.extractedPrice,
                source: prev.source, // keep original source of first occurrence
                extensions: Array.from(
                    new Set([
                        ...(prev.extensions || []),
                        ...(p.extensions || []),
                    ])
                ),
            };
            out[idx] = merged;
        }
    }
    return out;
}

/**
 * Selects the primary shopping detection item from a list of pages based on specific criteria.
 *
 * The function prioritizes pages in the following order:
 * 1. Pages with the source "google:shopping" and a valid `productPage`.
 * 2. Pages with a source starting with "vision:" and a valid `productPage`.
 * 3. If no suitable page is found, it returns a fallback object with an empty URL and "unknown" source.
 *
 * @param pages - An array of shopping detection items, each containing information about a product page.
 * @returns An object containing the selected page's URL, source, and optionally its price and name.
 */
function choosePrimary(pages: ShoppingDetectionItem["pages"]): {
    url: string;
    source: string;
    price?: number;
    name?: string;
} {
    // Prefer google:shopping first
    const shopping = pages.find(
        (p) => p.source === "google:shopping" && p.productPage
    );
    if (shopping) {
        return {
            url: shopping.productPage,
            source: "google:shopping",
            price: shopping.extractedPrice,
            name: shopping.name,
        };
    }
    // Otherwise the first Vision web page
    const visionWeb = pages.find(
        (p) => p.source?.startsWith("vision:") && p.productPage
    );
    if (visionWeb) {
        return {
            url: visionWeb.productPage,
            source: visionWeb.source || "vision:web",
            price: visionWeb.extractedPrice,
            name: visionWeb.name,
        };
    }
    // Fallback
    return { url: "", source: "unknown" };
}

/**
 * Searches for products on Google Shopping using the SerpAPI.
 *
 * This function queries the SerpAPI with the specified search query and retrieves
 * up to 15 shopping results. Each result includes details such as the product name,
 * price, product page URL, thumbnail, and other metadata.
 *
 * @param query - The search query string to look for products on Google Shopping.
 * @returns A promise that resolves to an array of shopping detection items, each containing
 *          product details such as name, product page URL, thumbnail, price, and extensions.
 *
 * @remarks
 * - The function requires the `SERPAPI_KEY` environment variable to be set. If it is not set,
 *   the function logs a warning and returns an empty array.
 * - The function uses the `fetch` API to make an HTTP GET request to the SerpAPI endpoint.
 * - If the HTTP request fails or the response is not in the expected format, the function logs
 *   a warning and returns an empty array.
 *
 * @example
 * ```typescript
 * const results = await searchGoogleShopping("laptop");
 * console.log(results);
 * ```
 */
async function searchGoogleShopping(query: string) {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
        logger.warn("SERPAPI_KEY not set; skipping Shopping API call");
        return [];
    }

    const params = new URLSearchParams({
        engine: "google_shopping",
        q: query,
        hl: "en",
        gl: "us",
        api_key: apiKey,
        sort_by: "1",
    });
    const url = `https://serpapi.com/search.json?${params.toString()}`;

    const resp = await fetch(url, { method: "GET" });
    if (!resp.ok) {
        logger.warn("SerpAPI shopping HTTP error", {
            status: resp.status,
            statusText: resp.statusText,
        });
        return [];
    }
    const data = (await resp.json()) as any;
    logger.debug(data);
    // `shopping_results` is the common array
    const results: any[] = Array.isArray(data?.shopping_results)
        ? data.shopping_results
        : [];

    return results.slice(0, 15).map((r) => {
        const priceNum = parsePriceToNumber(r.price);
        const productUrl: string = r.product_link || r.link || r.source || ""; // serp variations
        const name: string = r.title || r.name || r.product_title || "";
        const extensions: string[] = Array.isArray(r.extensions)
            ? r.extensions
            : [];

        return {
            name,
            productPage: productUrl,
            thumbnail: r.thumbnail || r.image,
            extractedPrice: priceNum,
            source: r.source,
            source_icon: r.source_icon,
            extensions,
        } as ShoppingDetectionItem["pages"][number];
    });
}

// === Main Trigger ===
/**
 * Cloud Function triggered when an image is uploaded to a specific storage path.
 * This function processes the uploaded image, performs web detection using the Vision API,
 * queries Google Shopping for related products, and synthesizes a `TripItem` object
 * with enriched data. The resulting `TripItem` is then persisted to the database.
 *
 * @param event - The event payload containing metadata about the uploaded object.
 *
 * The function performs the following steps:
 * 1. Validates that the uploaded file is an image and resides in the expected storage path.
 * 2. Downloads the image from the storage bucket.
 * 3. Uses the Vision API to perform web detection on the image.
 * 4. Builds a query from the Vision API results and queries Google Shopping for related products.
 * 5. Collects and merges pages from both Vision API results and Google Shopping results, removing duplicates.
 * 6. Synthesizes a `TripItem` object with fields such as name, price, product page, and source.
 * 7. Persists the `TripItem` object to the database.
 *
 * Logging is used throughout the function to provide insights into the processing steps,
 * including handling errors and ignoring invalid uploads.
 *
 * Expected storage path format: `users/{uid}/{tripId}/{itemId}.{ext}`
 *
 * @example
 * // Example of a valid file path:
 * // users/12345/trip6789/item123.jpg
 *
 * @remarks
 * - The function ignores non-image files and files not under the `users/{uid}/{tripId}/...` path.
 * - The Vision API is used to extract web detection data, which is then used to enrich the `TripItem`.
 * - Google Shopping is queried to provide additional product information.
 * - Deduplication is performed on the collected pages to ensure unique results.
 *
 * @throws Will log an error if any step in the process fails.
 */
export const onTripItemImageUpload = onObjectFinalized(
    { cpu: 1, memory: "512MiB", region: "us-central1" },
    async (event) => {
        const fileBucket = event.data.bucket;
        const filePath = event.data.name;
        const contentType = event.data.contentType;

        if (!contentType?.startsWith("image/") || !filePath) {
            logger.info("Ignoring non-image or missing path", {
                contentType,
                filePath,
            });
            return;
        }

        // Expected storage path: users/{uid}/{tripId}/{itemId}.{ext}
        const parts = filePath.split("/");
        if (parts.length < 4 || parts[0] !== "users") {
            logger.info("Ignoring object not under users/{uid}/{tripId}/...", {
                filePath,
            });
            return;
        }
        const [, uid, tripId] = parts;
        const fileName = parts[parts.length - 1];
        const itemId = fileName.replace(/\.[^.]+$/, ""); // strip extension

        try {
            // 1) Download image
            const bucket = getStorage().bucket(fileBucket);
            const [imageBuffer] = await bucket.file(filePath).download();

            // 2) Vision Web Detection
            const [visionResp] = await visionClient.webDetection({
                image: { content: imageBuffer },
            });
            const detections = visionResp.webDetection;
            logger.debug?.("Vision webDetection", detections);

            // 3) Build query, call Shopping
            const query = buildQueryFromVision(detections ?? undefined);
            const shoppingFromSerp = await searchGoogleShopping(query);

            // 4) Merge & dedupe (include all shopping results)
            const mergedPages = dedupePages([...shoppingFromSerp]);

            // 6) Synthesize TripItem fields
            const primary = choosePrimary(mergedPages);

            // Name: prefer primary name, else bestGuess/entity
            const fallbackName =
                detections?.bestGuessLabels?.[0]?.label ||
                detections?.webEntities?.[0]?.description ||
                "Item";

            console.log(shoppingFromSerp.length);
            console.log(mergedPages.length);
            const finalName = primary.name?.trim() || fallbackName || "Item";
            const bestPrice =
                mergedPages
                    .map((p) => p.extractedPrice)
                    .filter(
                        (v): v is number =>
                            typeof v === "number" && isFinite(v) && v > 0
                    )
                    .sort((a, b) => a - b)[0] ?? 0;

            const bestThumbnail = mergedPages.find(
                (p) => p.thumbnail
            )?.thumbnail;

            const tripItem: TripItem = {
                id: itemId,
                name: finalName,
                price: bestPrice,
                thumbnail: bestThumbnail,
                productPage: primary.url,
                source: primary.source,
                source_icon: mergedPages.find(
                    (p) => p.productPage === primary.url
                )?.source_icon,
                parsingStatus: "PARSED",
                _items: { pages: shoppingFromSerp },
            };

            addTripItemInternal(uid, tripId, tripItem);
            logger.info("Created TripItem with shopping enrichment", {
                uid,
                tripId,
                itemId,
                query,
                primary: primary.url,
                pagesCount: mergedPages.length,
            });
        } catch (err) {
            // Avoid passing raw error objects directly to firebase logger (can throw when serializing).
            try {
                const message =
                    err instanceof Error ? err.message : JSON.stringify(err);
                const stack = err instanceof Error ? err.stack : undefined;
                logger.error("onTripItemImageUpload failed:", {
                    message,
                    stack,
                });
            } catch (logErr) {
                // Fallback to console if logger serialization fails
                console.error(
                    "onTripItemImageUpload failed (logger serialization error):",
                    logErr
                );
                console.error("Original error:", err);
            }
        }
    }
);
