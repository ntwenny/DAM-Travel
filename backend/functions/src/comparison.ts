import { HttpsError, onCall } from "firebase-functions/v2/https";
import { firestore } from "firebase-admin";
import { logger } from "firebase-functions/v1";
import vision from "@google-cloud/vision";
import { onObjectFinalized } from "firebase-functions/storage";
import { getStorage } from "firebase-admin/storage";
import { TripItem, TripItemParsingStatus } from "./types/user";
import { addTripItemInternal } from "./trip";

const database = firestore();
const visionClient = new vision.ImageAnnotatorClient();

export const onLazyTripItemParsingRequest = onCall(async (request) => {
    const auth = request.auth;
    const data = request.data;

    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }
    const uid = auth.uid;
    const { tripItemId } = data as { tripItemId: string };

    const userDocReference = database.collection("users").doc(uid);
    const userDocSnapshot = await userDocReference.get();

    if (!userDocSnapshot.exists) {
        throw new HttpsError("not-found", "User document not found.");
    }

    const userData = userDocSnapshot.data();
    if (!userData) {
        throw new HttpsError("not-found", "User data is empty.");
    }

    const currentTrip = userData.trips.find(
        (trip: any) => trip.id === userData!.currentTripId
    );
    if (!currentTrip) {
        throw new HttpsError("not-found", "Current trip not found.");
    }

    const newTripItem: TripItem = {
        id: tripItemId,
        photo: "",
        description: "",
        date: "",
        price: 0,
        parsingStatus: TripItemParsingStatus.UNPARSED,
        rawDetectionData: null,
    };

    currentTrip.items.push(newTripItem);

    try {
        await userDocReference.update({ trips: userData.trips });
    } catch (error) {
        logger.error("Error updating user document with new trip item:", error);
        throw new HttpsError("internal", "Failed to update user document.");
    }

    return { status: 200 };
});

export const onTripItemImageUpload = onObjectFinalized({}, async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    if (!contentType?.startsWith("image/") || !filePath) {
        logger.error("Invalid file upload event data:", event.data);
        return;
    }

    // Parse file path to extract user ID and trip ID
    const pathParts = filePath.split("/");
    if (pathParts.length < 3 || pathParts[0] !== "users") {
        logger.info("Not a user trip item image path:", filePath);
        return;
    }

    const [, uid, tripId] = pathParts;

    try {
        const bucket = getStorage().bucket(fileBucket);
        const downloadResponse = await bucket.file(filePath).download();
        const imageBuffer = downloadResponse[0];

        const [result] = await visionClient.webDetection({
            image: { content: imageBuffer },
        });

        const detections = result.webDetection;
        logger.info("Web detection results: ", detections);

        // Extract item information from vision API results
        let itemName = "Item from Image";
        let estimatedPrice = 0;

        // Try to extract product name from web entities
        if (detections?.webEntities && detections.webEntities.length > 0) {
            const topEntity = detections.webEntities[0];
            if (topEntity.description) {
                itemName = topEntity.description;
            }
        }

        // Create trip item using the centralized function
        const newTripItem = {
            name: itemName,
            price: estimatedPrice,
            imageUrl: `gs://${fileBucket}/${filePath}`,
            notes: "Automatically detected from uploaded image",
            category: "Auto-detected",
        };

        await addTripItemInternal(uid, tripId, newTripItem);
        logger.info(
            `Successfully created trip item from image for trip ${tripId}`
        );
    } catch (error) {
        logger.error("Error processing image upload:", error);
    }
});
