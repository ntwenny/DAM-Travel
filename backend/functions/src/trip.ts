import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {getStorage} from "firebase-admin/storage";
import {Trip, TripItem, Receipt, CartItem} from "./types/trip";
import currency from "currency.js";
import salesTax from "sales-tax";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {getFirestore} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";

const db = admin.firestore();
const USERS_COLLECTION = "users";
const TRIPS_SUBCOLLECTION = "trips";
const TRIP_ITEMS_SUBCOLLECTION = "tripItems";
const CART_SUBCOLLECTION = "cart";

type StoredTripSummary = {
    id?: string;
    name?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    totalBudget?: number;
    items?: unknown[];
};

type UserDocumentData = {
    trips?: StoredTripSummary[];
    currentTripId?: string | null;
} & Record<string, unknown>;

function getTripRef(uid: string, tripId: string) {
  return db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(TRIPS_SUBCOLLECTION)
    .doc(tripId);
}

function getTripItemRef(uid: string, tripId: string, tripItemId: string) {
  return getTripRef(uid, tripId)
    .collection(TRIP_ITEMS_SUBCOLLECTION)
    .doc(tripItemId);
}

function getCartCollection(uid: string, tripId: string) {
  return getTripRef(uid, tripId).collection(CART_SUBCOLLECTION);
}

export type CreateTripParams = {
    name?: string;
    location?: string;
    currency?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    budget?: number;
};

export async function createTripInternal(
  uid: string,
  params: CreateTripParams = {}
): Promise<Trip> {
  const {
    name = "New Trip",
    location = "",
    currency: tripCurrency = "",
    startDate,
    endDate,
    budget = 0,
  } = params || {};

  const tripRef = db.collection("users").doc(uid).collection("trips").doc();

  const tripRecord: Trip = {
    id: tripRef.id,
    name,
    location,
    currency: tripCurrency || "",
    budget,
    startDate: startDate ? new Date(startDate) : new Date(),
    endDate: endDate ? new Date(endDate) : new Date(),
  };

  await tripRef.set(tripRecord);

  // Create storage directory for the trip (placeholder file)
  try {
    const bucket = getStorage().bucket();
    const tripInitPath = `users/${uid}/${tripRef.id}/.init`;
    await bucket.file(tripInitPath).save("", {
      metadata: {
        contentType: "text/plain",
        metadata: {createdAt: new Date().toISOString()},
      },
    });
  } catch (err) {
    console.error("Failed to create storage directory for trip:", err);
  }

  // Update user's trips array and set currentTripId
  try {
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      const userData = userSnap.data() || {};
      const minimal = {
        id: tripRef.id,
        name,
        destination: location,
        startDate: tripRecord.startDate.toISOString(),
        endDate: tripRecord.endDate.toISOString(),
        currency: tripCurrency,
        totalBudget: budget,
        items: [],
      };
      const existingTrips = Array.isArray(userData.trips) ?
        userData.trips :
        [];
      existingTrips.push(minimal);
      await userRef.update({
        trips: existingTrips,
        currentTripId: tripRef.id,
      });
    }
  } catch (err) {
    console.error("Failed to update user document with new trip:", err);
  }

  return tripRecord;
}

// Callable wrapper that delegates to internal creator
export const createTrip = functions.https.onCall(async (request) => {
  if (!request || !request.auth || !request.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
  const uid = request.auth.uid;
  const params = request.data || {};
  return createTripInternal(uid, params as CreateTripParams);
});

// Delete a trip for the authenticated user
export const deleteTrip = functions.https.onCall(async (request) => {
  if (!request || !request.auth || !request.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const uid = request.auth.uid;
  const {tripId} = request.data || {};
  if (!tripId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "tripId is required"
    );
  }

  const tripRef = db
    .collection("users")
    .doc(uid)
    .collection("trips")
    .doc(tripId);

  try {
    // Delete all tripItems under the trip (best-effort)
    const itemsSnap = await tripRef.collection("tripItems").get();
    const batch = db.batch();
    itemsSnap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    // Delete trip document
    await tripRef.delete();

    // Remove from user's trips array and clear currentTripId if it matched
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      const userData = (userSnap.data() as UserDocumentData) || {};
      const existingTrips = Array.isArray(userData.trips) ?
        userData.trips :
        [];
      const filtered = existingTrips.filter(
        (tripSummary) => tripSummary?.id !== tripId
      );
      const updates: {
                trips: StoredTripSummary[];
                currentTripId?: string | null;
            } = {trips: filtered};
      if (userData.currentTripId === tripId) {
        updates.currentTripId =
                    filtered.length > 0 ? filtered[0].id ?? null : null;
      }
      await userRef.update(updates);
    }
  } catch (error) {
    console.error("Failed to delete trip:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to delete trip"
    );
  }

  return {success: true};
});
/**
 * Cloud Function to add an item to a trip. This function is triggered via an HTTPS callable request.
 *
 * @param {functions.https.CallableContext} request - The request object
 *        containing the authenticated user's context and data.
 * @throws {functions.https.HttpsError} If the user is not authenticated.
 * @throws {functions.https.HttpsError} If the required data (tripId or item)
 *        is missing or invalid.
 *
 * @returns {Promise<TripItem>} A promise that resolves with the result of the
 *          `addTripItemInternal` function.
 *
 * @example
 * // Example of calling the function from the client:
 * const addItemResponse = await firebase.functions().httpsCallable('addTripItem')({
 *   tripId: 'trip123',
 *   item: { name: 'Backpack', quantity: 1 }
 * });
 * console.log(addItemResponse.data);
 */
export const addTripItem = functions.https.onCall(async (request) => {
  if (!request || !request.auth || !request.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const {tripId, item} = request.data;
  const uid = request.auth.uid;

  return await addTripItemInternal(uid, tripId, item);
});

/**
 * Adds a new item to a trip for a specific user.
 *
 * @param {string} uid - The unique identifier of the user.
 * @param {string} tripId - The unique identifier of the trip.
 * @param {Partial<TripItem>} item - A partial object representing the trip item
 *        to be added. It may include properties such as name, price, currency,
 *        imageUrl, notes, category, and links.
 * @return {Promise<TripItem>} A promise that resolves to the newly added `TripItem` object.
 * @throws Will throw an error if the trip does not exist.
 *
 * @remarks
 * - If the `item.currency` is different from the trip's currency, a mock exchange rate is used for conversion.
 * - The `name` property defaults to "Unnamed Item" if not provided.
 * - The `price` property defaults to 0 if not provided.
 * - The `currency` property defaults to the trip's currency if not provided.
 * - This function assumes a simplified currency conversion for demonstration purposes.
 */
export async function addTripItemInternal(
  uid: string,
  tripId: string,
  item: Partial<TripItem>
): Promise<TripItem> {
  functions.logger.debug("addTripItemInternal called with:", {
    uid,
    tripId,
    item,
  });
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
  functions.logger.debug("Found trip:", trip);

  const itemsCollection = db
    .collection("users")
    .doc(uid)
    .collection("trips")
    .doc(tripId)
    .collection("tripItems");

  const newItemRef = item.id ?
    itemsCollection.doc(item.id) :
    itemsCollection.doc();

  // Merge with defaults and ensure schema compliance
  const tripItem: TripItem = {
    id: newItemRef.id,
    name: item.name || "Unnamed Item",
    price: item.price || 0,
    currency: item.currency || trip.currency,
    thumbnail: item.thumbnail,
    productPage: item.productPage,
    source: item.source,
    source_icon: item.source_icon,
    _items: item._items,
    parsingStatus: item.parsingStatus || "NOT_READY",
    isInCart: item.isInCart || false,
  };

  // Remove undefined fields before writing to Firestore
  const sanitizedItem = sanitizeForFirestore(tripItem);

  functions.logger.debug("Setting sanitized item to Firestore:", {
    ref: newItemRef.path,
    sanitizedItem,
  });
  await newItemRef.set(sanitizedItem, {merge: true});

  return sanitizedItem;
}

/**
 * Recursively removes properties with `undefined` values from an object.
 * This is useful for preparing data to be stored in Firestore, which does not
 * support `undefined` values.
 *
 * @param obj - The object to sanitize.
 * @returns A new object with all `undefined` properties removed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeForFirestore(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore).filter((v) => v !== undefined);
  }

  const newObj: { [key: string]: unknown } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        newObj[key] = sanitizeForFirestore(value);
      }
    }
  }
  return newObj;
}

/**
 * Cloud Function to retrieve trip items for a specific trip.
 *
 * @param {functions.https.CallableContext} request - The request object containing the authenticated user's context and data.
 * @throws {functions.https.HttpsError} If the user is not authenticated.
 * @throws {functions.https.HttpsError} If the required data (tripId) is missing or invalid.
 *
 * @returns {Promise<TripItem[]>} A promise that resolves with an array of `TripItem` objects.
 *
 * @example
 * // Example of calling the function from the client:
 * const itemsResponse = await firebase.functions().httpsCallable('getTripItems')({
 *   tripId: 'trip123'
 * });
 * console.log(itemsResponse.data);
 */
export const getTripItems = functions.https.onCall(async (request) => {
  if (!request || !request.auth || !request.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const {tripId} = request.data;
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

export const getTripItem = functions.https.onCall(async (request) => {
  if (!request || !request.auth || !request.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const {tripId, tripItemId} = request.data;
  const uid = request.auth.uid;

  const itemDoc = await db
    .collection("users")
    .doc(uid)
    .collection("trips")
    .doc(tripId)
    .collection("tripItems")
    .doc(tripItemId)
    .get();

  if (!itemDoc.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Trip item not found."
    );
  }

  return itemDoc.data() as TripItem;
});

export const updateTripItem = functions.https.onCall(async (request) => {
  if (!request || !request.auth || !request.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const {tripId, tripItemId, ...updateData} = request.data;
  const uid = request.auth.uid;

  if (!tripId || !tripItemId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "tripId and tripItemId are required."
    );
  }

  const itemRef = db
    .collection("users")
    .doc(uid)
    .collection("trips")
    .doc(tripId)
    .collection("tripItems")
    .doc(tripItemId);

  await itemRef.update(updateData);

  return {success: true};
});

export const addCartItem = functions.https.onCall(async (request) => {
  if (!request || !request.auth || !request.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const {tripId, tripItemId, quantity = 1} = request.data || {};
  const qty = Number(quantity);
  if (!tripId || !tripItemId || Number.isNaN(qty) || qty <= 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "tripId, tripItemId and a positive quantity are required."
    );
  }

  const uid = request.auth.uid;
  const tripRef = getTripRef(uid, tripId);
  const tripDoc = await tripRef.get();
  if (!tripDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Trip not found.");
  }

  const tripItemRef = getTripItemRef(uid, tripId, tripItemId);
  const tripItemSnap = await tripItemRef.get();
  if (!tripItemSnap.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Trip item not found."
    );
  }

  const cartCollection = getCartCollection(uid, tripId);
  const cartDocRef = cartCollection.doc(tripItemId);
  const existingCartSnap = await cartDocRef.get();
  const now = new Date();

  if (existingCartSnap.exists) {
    const existing = existingCartSnap.data() as CartItem;
    const newQuantity = (existing.quantity || 0) + qty;
    await cartDocRef.update({
      quantity: newQuantity,
      addedAt: now,
    });
    await tripItemRef.update({isInCart: true});
    return {
      ...existing,
      tripItemId: existing.tripItemId || tripItemId,
      quantity: newQuantity,
      addedAt: now,
    };
  }

  const tripItem = tripItemSnap.data() as TripItem;

  const cartItem: CartItem = {
    ...tripItem,
    id: cartDocRef.id,
    tripItemId,
    isInCart: true,
    quantity: qty,
    addedAt: now,
    homeTax: false,
  };

  await cartDocRef.set(cartItem);
  await tripItemRef.update({isInCart: true});

  return cartItem;
});

export const removeCartItem = functions.https.onCall(async (request) => {
  if (!request || !request.auth || !request.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const {tripId, tripItemId} = request.data || {};
  if (!tripId || !tripItemId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "tripId and tripItemId are required."
    );
  }

  const uid = request.auth.uid;
  const cartDocRef = getCartCollection(uid, tripId).doc(tripItemId);
  const cartDoc = await cartDocRef.get();
  if (!cartDoc.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Cart item not found."
    );
  }

  await cartDocRef.delete();
  await getTripItemRef(uid, tripId, tripItemId).set(
    {isInCart: false},
    {merge: true}
  );

  return {success: true};
});

export const updateCartItemQuantity = functions.https.onCall(
  async (request) => {
    if (!request || !request.auth || !request.auth.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    const {tripId, tripItemId, quantity} = request.data || {};
    const qty = Number(quantity);
    if (
      !tripId ||
            !tripItemId ||
            Number.isNaN(qty) ||
            !Number.isFinite(qty)
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "tripId, tripItemId and a numeric quantity are required."
      );
    }

    const uid = request.auth.uid;
    const cartDocRef = getCartCollection(uid, tripId).doc(tripItemId);
    const cartDoc = await cartDocRef.get();
    if (!cartDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Cart item not found."
      );
    }

    if (qty <= 0) {
      await cartDocRef.delete();
      await getTripItemRef(uid, tripId, tripItemId).set(
        {isInCart: false},
        {merge: true}
      );
      return {removed: true};
    }

    await cartDocRef.update({quantity: qty});
    const existingData = cartDoc.data() as CartItem;
    const nextItem: CartItem = {
      ...existingData,
      tripItemId: existingData.tripItemId || tripItemId,
      quantity: qty,
    };

    return nextItem;
  }
);

export const getCartItems = functions.https.onCall(async (request) => {
  if (!request || !request.auth || !request.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const {tripId} = request.data || {};
  if (!tripId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "tripId is required."
    );
  }

  const uid = request.auth.uid;
  const cartSnap = await getCartCollection(uid, tripId).get();
  const items: CartItem[] = [];
  cartSnap.forEach((doc) => {
    items.push(doc.data() as CartItem);
  });

  const total = items.reduce((acc, item) => {
    const qty = item.quantity ?? 1;
    return currency(acc).add(currency(item.price || 0).multiply(qty)).value;
  }, 0);

  return {items, total};
});

export const clearCart = functions.https.onCall(async (request) => {
  if (!request || !request.auth || !request.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const {tripId} = request.data || {};
  if (!tripId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "tripId is required."
    );
  }

  const uid = request.auth.uid;
  const cartCollection = getCartCollection(uid, tripId);
  const cartSnap = await cartCollection.get();
  if (cartSnap.empty) {
    return {removed: 0};
  }

  const batch = db.batch();
  cartSnap.forEach((doc) => {
    const data = doc.data() as CartItem;
    batch.delete(doc.ref);
    const tripItemId = data.tripItemId || doc.id;
    const tripItemRef = getTripItemRef(uid, tripId, tripItemId);
    batch.set(tripItemRef, {isInCart: false}, {merge: true});
  });

  await batch.commit();
  return {removed: cartSnap.size};
});

export const updateCartItemHomeTax = functions.https.onCall(async (request) => {
  if (!request || !request.auth || !request.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const {tripId, tripItemId, homeTax} = request.data || {};
  if (!tripId || !tripItemId || typeof homeTax !== "boolean") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "tripId, tripItemId and homeTax (boolean) are required."
    );
  }

  const uid = request.auth.uid;
  const cartDocRef = getCartCollection(uid, tripId).doc(tripItemId);
  const cartDoc = await cartDocRef.get();
  if (!cartDoc.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Cart item not found."
    );
  }

  await cartDocRef.update({homeTax});
  const existingData = cartDoc.data() as CartItem;
  const nextItem: CartItem = {
    ...existingData,
    tripItemId: existingData.tripItemId || tripItemId,
    homeTax,
  };

  return nextItem;
});

// Sets the user's currentTripId to the provided tripId (if the trip exists)
export const setCurrentTrip = functions.https.onCall(async (request) => {
  if (!request || !request.auth || !request.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const {tripId} = request.data || {};
  if (!tripId || typeof tripId !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "tripId (string) is required."
    );
  }

  const uid = request.auth.uid;
  const tripRef = getTripRef(uid, tripId);
  const tripSnap = await tripRef.get();
  if (!tripSnap.exists) {
    // Auto-heal: if the trip doc is missing but exists in the user's
    // 'trips' array, synthesize a minimal Trip document for consistency.
    const userRef = db.collection(USERS_COLLECTION).doc(uid);
    const userDoc = await userRef.get();
    const userData = (userDoc.data() as UserDocumentData) || {};
    const tripsArr = Array.isArray(userData.trips) ? userData.trips : [];
    const minimal = tripsArr.find(
      (tripSummary) => tripSummary?.id === tripId
    );
    if (!minimal) {
      throw new functions.https.HttpsError(
        "not-found",
        "Trip not found for this user."
      );
    }

    const tripRecord: Trip = {
      id: tripId,
      name: minimal.name || "Trip",
      location: minimal.destination || "",
      currency: "",
      budget: Number(minimal.totalBudget) || 0,
      startDate: minimal.startDate ?
        new Date(minimal.startDate) :
        new Date(),
      endDate: minimal.endDate ? new Date(minimal.endDate) : new Date(),
    };
    await tripRef.set(tripRecord, {merge: true});
  }

  const userRef = db.collection(USERS_COLLECTION).doc(uid);
  await userRef.set({currentTripId: tripId}, {merge: true});

  return {currentTripId: tripId};
});

// Returns the list of trips for the authenticated user.
export const getTrips = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
  const uid = request.auth.uid;
  const userRef = getFirestore().collection("users").doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    // If the user document doesn't exist, create it.
    // This can happen if the onUserCreate trigger is slow.
    try {
      const authUser = await getAuth().getUser(uid);
      const initialData = {
        email: authUser.email,
        displayName: authUser.displayName,
        photoURL: authUser.photoURL,
        createdAt: new Date(),
        trips: [],
        finance: {
          budget: 0,
          categories: [],
        },
      };
      await userRef.set(initialData);
      return {trips: []};
    } catch (error) {
      console.error(`Failed to create user document for ${uid}`, error);
      throw new HttpsError(
        "internal",
        "Failed to retrieve or create user data."
      );
    }
  }

  const data = userDoc.data();
  return {trips: data?.trips ?? []};
});

export const createReceipt = functions.https.onCall(async (request) => {
  if (!request || !request.auth || !request.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const {tripId, items} = request.data;
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

  // Get user's home country
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "User profile not found."
    );
  }
  const userData = userDoc.data();
  const homeCountry = userData?.homeCountry;
  if (!homeCountry) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Home country is not set. Please update your profile."
    );
  }

  const trip = tripDoc.data() as Trip;
  const subtotal = items.reduce(
    (acc: number, item: CartItem) => {
      const itemTotal = item.price * (item.quantity || 1);
      return currency(acc).add(itemTotal).value;
    },
    0
  );

  let totalTax = 0;
  const taxRates: number[] = [];

  for (const item of items) {
    const itemPrice = item.price * (item.quantity || 1);
    
    // Determine which country's tax to use
    const taxCountry = item.homeTax ? homeCountry : trip.location;
    
    try {
      const countryCode = taxCountry.trim().toUpperCase();
      const taxInfo = await salesTax.getSalesTax(
        countryCode,
        countryCode === "US" ? "TX" : undefined
      );
      const itemTaxRate = taxInfo.rate || 0;
      
      if (itemTaxRate === 0) {
        console.warn(
          `Tax rate is 0 for country: ${taxCountry} (item: ${item.name})`
        );
      }
      
      const itemTax = currency(itemPrice).multiply(itemTaxRate).value;
      totalTax = currency(totalTax).add(itemTax).value;
      taxRates.push(itemTaxRate);
      
    } catch (error) {
      console.error(
        `Error getting tax for ${taxCountry} (item: ${item.name}):`,
        error
      );
      taxRates.push(0);
    }
  }

  // Calculate average tax rate for display
  const avgTaxRate = taxRates.length > 0 
    ? taxRates.reduce((sum, rate) => sum + rate, 0) / taxRates.length 
    : 0;

  // Add service fees
  const additionalCosts = getAdditionalCosts(trip.location, subtotal);
  const serviceFee = additionalCosts.serviceFee;

  const totalBeforeFees = currency(subtotal).add(totalTax).value;
  const total = currency(totalBeforeFees).add(serviceFee).value;

  const receipt: Receipt = {
    items,
    subtotal,
    tax: totalTax,
    serviceFee,
    total,
    currency: trip.currency,
    country: trip.location,
    taxRate: avgTaxRate,
  };
  

  return receipt;
});

// Helper function to calculate additional costs based on country
function getAdditionalCosts(countryCode: string, subtotal: number) {
  const countrySpecificCosts: { [key: string]: { serviceFeeRate: number } } =
        {
          US: {serviceFeeRate: 0.03}, // 3% service fee for US
          FR: {serviceFeeRate: 0.025}, // 2.5% service fee for France
          JP: {serviceFeeRate: 0.02}, // 2% service fee for Japan
          GB: {serviceFeeRate: 0.035}, // 3.5% service fee for UK
          DE: {serviceFeeRate: 0.025}, // 2.5% service fee for Germany
        };

  const costs = countrySpecificCosts[countryCode] || {serviceFeeRate: 0.02}; // Default 2%

  return {
    serviceFee: currency(subtotal).multiply(costs.serviceFeeRate).value,
  };
}
