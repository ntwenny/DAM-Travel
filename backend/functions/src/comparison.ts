import {onObjectFinalized} from "firebase-functions/storage";
import {getStorage} from "firebase-admin/storage";
import {logger} from "firebase-functions/v1";
import {addTripItemInternal} from "./trip";
import {TripItem, ShoppingDetectionItem} from "./types/trip";

// Map currency symbols to ISO currency codes
function getCurrencyCode(symbol: string): string {
  const currencyMap: Record<string, string> = {
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
    "¥": "JPY",
    "₹": "INR",
    "₩": "KRW",
    "₽": "RUB",
    "R$": "BRL",
    "C$": "CAD",
    "A$": "AUD",
    "CHF": "CHF",
    "CN¥": "CNY",
    "HK$": "HKD",
    "NZ$": "NZD",
    "kr": "SEK",
    "Mex$": "MXN",
    "S$": "SGD",
  };
  return currencyMap[symbol] || "USD";
}

// Convert price from source currency to USD
async function convertToUSD(
  amount: number,
  currencySymbol: string
): Promise<number> {
  const fromCurrency = getCurrencyCode(currencySymbol);

  // If already in USD, return the amount
  if (fromCurrency === "USD") {
    return amount;
  }

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) {
    logger.warn("EXCHANGE_RATE_API_KEY not set; using original price");
    return amount;
  }

  try {
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${fromCurrency}`;
    const response = await fetch(url);

    if (!response.ok) {
      logger.warn("Failed to fetch exchange rate", {
        status: response.status,
        from: fromCurrency,
      });
      return amount;
    }

    const body = await response.json();
    const rate = body?.conversion_rates?.["USD"];

    if (!rate || !Number.isFinite(rate)) {
      logger.warn("Invalid exchange rate", {from: fromCurrency});
      return amount;
    }

    const converted = amount * rate;
    logger.debug("Currency converted", {
      from: fromCurrency,
      amount,
      rate,
      converted,
    });

    return converted;
  } catch (err) {
    logger.warn("Currency conversion error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return amount;
  }
}

async function searchGoogleLensProducts(
  imageUrl: string
): Promise<ShoppingDetectionItem["pages"]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    logger.warn("SERPAPI_KEY not set; skipping Lens API call");
    return [];
  }

  const params = new URLSearchParams({
    engine: "google_lens",
    url: imageUrl, // public URL of image
    type: "products",
    hl: "en",
    gl: "us",
    api_key: apiKey,
  });

  const resp = await fetch(
    `https://serpapi.com/search.json?${params.toString()}`,
    {method: "GET"}
  );

  if (!resp.ok) {
    logger.warn("SerpAPI Lens HTTP error", {
      status: resp.status,
      statusText: resp.statusText,
    });
    return [];
  }

  const body = await resp.json();
  logger.debug("Lens Products Response", body);

  const results = Array.isArray(body.visual_matches) ?
    body.visual_matches :
    [];

  // Filter results with valid prices and convert to USD
  const resultsWithPrices = results.filter(
    (r: any) => r.price && r.price.extracted_value !== undefined
  );

  const mappedResults: ShoppingDetectionItem["pages"] = await Promise.all(
    resultsWithPrices.map(
      async (r: any): Promise<ShoppingDetectionItem["pages"][number]> => {
        const currencySymbol = r.price.currency || "$";
        const originalPrice = r.price.extracted_value;
        const convertedPrice = await convertToUSD(
          originalPrice,
          currencySymbol
        );

        return {
          name: r.title || r.name,
          productPage: r.link || r.source_url,
          thumbnail: r.thumbnail,
          extractedPrice: Math.round(convertedPrice * 100) / 100,
          source: r.source,
          source_icon: r.source_icon,
          extensions: r.extensions || [],
        };
      }
    )
  );

  return mappedResults;
}

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
      const idx = seen.get(key)!;
      const prev = out[idx];
      const mergedPrice =
                prev.extractedPrice !== undefined &&
                p.extractedPrice !== undefined ?
                  Math.min(prev.extractedPrice, p.extractedPrice) :
                  prev.extractedPrice ?? p.extractedPrice;
      out[idx] = {
        ...prev,
        name: prev.name || p.name,
        thumbnail: prev.thumbnail || p.thumbnail,
        extractedPrice: mergedPrice,
        extensions: Array.from(
          new Set([
            ...(prev.extensions || []),
            ...(p.extensions || []),
          ])
        ),
      };
    }
  }
  return out;
}

export const onTripItemImageUpload = onObjectFinalized(
  {cpu: 1, memory: "512MiB", region: "us-central1"},
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

    const parts = filePath.split("/");
    if (parts.length < 4 || parts[0] !== "users") {
      logger.info("Ignoring file not under users/{uid}/{tripId}/…", {
        filePath,
      });
      return;
    }

    const [, uid, tripId] = parts;
    const itemId = parts[parts.length - 1].replace(/\.[^.]+$/, "");

    try {
      const bucket = getStorage().bucket(fileBucket);
      const destinationFile = bucket.file(filePath);

      // Make the file publicly readable (so SerpApi can fetch it via URL)
      await destinationFile.makePublic();

      // Build the publicly accessible URL for the file
      const publicUrl =
                process.env.FUNCTIONS_EMULATOR === "true" ?
                  "https://linefriendssquare.com/cdn/shop/files/newjeans-apparel-newjeans-x-murakami-melange-gray-39818847453383.jpg?v=1719212172&width=1946" :
                  `https://storage.googleapis.com/${fileBucket}/${encodeURIComponent(
                    filePath
                  )}`;

      logger.debug("Public URL of uploaded image", {publicUrl});

      // Call Lens API with public URL
      const lensPages = await searchGoogleLensProducts(publicUrl);

      // Deduplicate
      const mergedPages = dedupePages(lensPages);

      const primary = mergedPages[0];
      if (!primary) {
        logger.info("Lens returned no product matches", {
          uid,
          tripId,
          itemId,
        });
        return;
      }

      const tripItem: TripItem = {
        id: itemId,
        name: primary.name || "Untitled Item",
        price: primary.extractedPrice ?? 0,
        thumbnail: primary.thumbnail,
        productPage: primary.productPage,
        source: primary.source,
        source_icon: primary.source_icon,
        parsingStatus: "PARSED",
        _items: {pages: mergedPages},
      };

      await addTripItemInternal(uid, tripId, tripItem);

      logger.info("Created TripItem via Google Lens", {
        uid,
        tripId,
        itemId,
        primary: primary.productPage,
        pagesCount: mergedPages.length,
      });
    } catch (err) {
      const message =
                err instanceof Error ? err.message : JSON.stringify(err);
      logger.error("onTripItemImageUpload failed", {message});
    }
  }
);
