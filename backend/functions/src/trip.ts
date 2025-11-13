import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Trip, TripItem, Receipt } from "./types/trip";
import currency from "currency.js";
import * as salesTax from "sales-tax";

const db = admin.firestore();

export const addTripItem = functions.https.onCall(async (request) => {
    if (!request || !request.auth || !request.auth.uid) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }

    const { tripId, item } = request.data;
    const uid = request.auth.uid;

    return await addTripItemInternal(uid, tripId, item);
});

// Internal helper function that can be called from other modules
export async function addTripItemInternal(
    uid: string,
    tripId: string,
    item: Partial<TripItem>
): Promise<TripItem> {
    const tripRef = db
        .collection("users")
        .doc(uid)
        .collection("trips")
        .doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
        throw new Error("Trip not found.");
    }

    const trip = tripDoc.data() as Trip;
    const newItemRef = tripRef.collection("tripItems").doc();

    const tripItem: TripItem = {
        id: newItemRef.id,
        name: item.name || "Unnamed Item",
        price: item.price || 0,
        currency: item.currency || trip.currency,
        imageUrl: item.imageUrl,
        notes: item.notes,
        category: item.category,
    };

    // Currency conversion
    if (item.currency && item.currency !== trip.currency) {
        // This is a simplified conversion. In a real app, you'd use an exchange rate API.
        // For this example, let's assume a simple 1:1 conversion if not specified,
        // or use a mock rate.
        const mockExchangeRate = 1.1; // 1 item.currency = 1.1 trip.currency
        tripItem.price = currency(item.price || 0).multiply(
            mockExchangeRate
        ).value;
        tripItem.currency = trip.currency;
    }

    await newItemRef.set(tripItem);
    return tripItem;
}

export const getTripItems = functions.https.onCall(async (request) => {
    if (!request || !request.auth || !request.auth.uid) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }

    const { tripId } = request.data;
    const uid = request.auth.uid;

    const itemsSnapshot = await db
        .collection("users")
        .doc(uid)
        .collection("trips")
        .doc(tripId)
        .collection("tripItems")
        .get();

    const items: TripItem[] = [];
    itemsSnapshot.forEach((doc) => {
        items.push(doc.data() as TripItem);
    });

    return items;
});

export const createReceipt = functions.https.onCall(async (request) => {
    if (!request || !request.auth || !request.auth.uid) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }

    const { tripId, items } = request.data;
    const uid = request.auth.uid;

    const tripDoc = await db
        .collection("users")
        .doc(uid)
        .collection("trips")
        .doc(tripId)
        .get();

    if (!tripDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Trip not found.");
    }

    const trip = tripDoc.data() as Trip;
    const subtotal = items.reduce(
        (acc: number, item: TripItem) => currency(acc).add(item.price).value,
        0
    );

    let taxRate = 0;
    let serviceFee = 0;

    try {
        // Get tax rate using sales-tax library
        const taxInfo = await salesTax.getSalesTax(trip.location);
        taxRate = taxInfo.rate || 0;

        // Add additional costs based on country
        const additionalCosts = getAdditionalCosts(trip.location, subtotal);
        serviceFee = additionalCosts.serviceFee;
    } catch (error) {
        console.error(
            "Error getting tax info for country:",
            trip.location,
            error
        );
        // Fallback to 0 tax rate if country not supported
        taxRate = 0;
    }

    const tax = currency(subtotal).multiply(taxRate).value;
    const totalBeforeFees = currency(subtotal).add(tax).value;
    const total = currency(totalBeforeFees).add(serviceFee).value;

    const receipt: Receipt = {
        items,
        subtotal,
        tax,
        serviceFee,
        total,
        currency: trip.currency,
        country: trip.location,
    };

    return receipt;
});

// Helper function to calculate additional costs based on country
function getAdditionalCosts(countryCode: string, subtotal: number) {
    const countrySpecificCosts: { [key: string]: { serviceFeeRate: number } } =
        {
            US: { serviceFeeRate: 0.03 }, // 3% service fee for US
            FR: { serviceFeeRate: 0.025 }, // 2.5% service fee for France
            JP: { serviceFeeRate: 0.02 }, // 2% service fee for Japan
            GB: { serviceFeeRate: 0.035 }, // 3.5% service fee for UK
            DE: { serviceFeeRate: 0.025 }, // 2.5% service fee for Germany
        };

    const costs = countrySpecificCosts[countryCode] || { serviceFeeRate: 0.02 }; // Default 2%

    return {
        serviceFee: currency(subtotal).multiply(costs.serviceFeeRate).value,
    };
}
