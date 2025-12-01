import * as functions from "firebase-functions";
import {firestore} from "firebase-admin";
import {FinanceState, Category, Item} from "./types/finance";

const db = firestore();

const DEFAULT_FINANCE: FinanceState = {
  budget: 0,
  categories: [],
};

// Helper to get the trip document reference for finance data
async function getFinanceDocRef(uid: string, tripId: string) {
  const tripRef = db.collection("users").doc(uid).collection("trips").doc(tripId);
  return tripRef;
}

export const getFinance = functions.https.onCall(async (request) => {
  const uid = request.data?.userId || request.auth?.uid;
  const tripId = request.data?.tripId;
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "User ID required");
  }
  if (!tripId) {
    throw new functions.https.HttpsError("invalid-argument", "Trip ID required");
  }
  const tripRef = await getFinanceDocRef(uid, tripId);
  const snap = await tripRef.get();
  const data = snap.data() || {};
  const finance: FinanceState = data.finance || DEFAULT_FINANCE;
  return finance;
});

export const updateBudget = functions.https.onCall(async (request) => {
  const uid = request.data?.userId || request.auth?.uid;
  const tripId = request.data?.tripId;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "User ID required");
  if (!tripId) throw new functions.https.HttpsError("invalid-argument", "Trip ID required");
  const budget = Number(request.data?.budget ?? NaN);
  if (Number.isNaN(budget) || budget < 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Budget must be a non-negative number"
    );
  }

  const tripRef = await getFinanceDocRef(uid, tripId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(tripRef);
    const data = snap.data() || {};
    const finance: FinanceState = data.finance || {
      budget: 0,
      categories: [],
    };
    finance.budget = budget;
    tx.update(tripRef, {finance});
  });
  return {budget};
});

export const addCategory = functions.https.onCall(async (request) => {
  const uid = request.data?.userId || request.auth?.uid;
  const tripId = request.data?.tripId;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "User ID required");
  if (!tripId) throw new functions.https.HttpsError("invalid-argument", "Trip ID required");
  const name = (request.data?.name || "").trim();
  if (!name) {
    throw new functions.https.HttpsError("invalid-argument", "Category name required");
  }

  const id = Date.now().toString();
  const newCategory: Category = {id, name, items: []};

  const tripRef = await getFinanceDocRef(uid, tripId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(tripRef);
    const data = snap.data() || {};
    const finance: FinanceState = data.finance || {
      budget: 0,
      categories: [],
    };
    finance.categories = [newCategory, ...finance.categories];
    tx.update(tripRef, {finance});
  });

  return newCategory;
});

export const deleteCategory = functions.https.onCall(async (request) => {
  const uid = request.data?.userId || request.auth?.uid;
  const tripId = request.data?.tripId;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "User ID required");
  if (!tripId) throw new functions.https.HttpsError("invalid-argument", "Trip ID required");
  const id = String(request.data?.id || "");
  if (!id) throw new functions.https.HttpsError("invalid-argument", "Category id required");

  const tripRef = await getFinanceDocRef(uid, tripId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(tripRef);
    const data = snap.data() || {};
    const finance: FinanceState = data.finance || {
      budget: 0,
      categories: [],
    };
    finance.categories = finance.categories.filter((c) => c.id !== id);
    tx.update(tripRef, {finance});
  });

  return {id};
});

export const addTransaction = functions.https.onCall(async (request) => {
  const uid = request.data?.userId || request.auth?.uid;
  const tripId = request.data?.tripId;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "User ID required");
  if (!tripId) throw new functions.https.HttpsError("invalid-argument", "Trip ID required");
  const {categoryId, name} = request.data || {};
  const amount = Number(request.data?.amount ?? NaN);
  if (!categoryId) {
    throw new functions.https.HttpsError("invalid-argument", "categoryId required");
  }
  if (!name || String(name).trim() === "") {
    throw new functions.https.HttpsError("invalid-argument", "name required");
  }
  if (Number.isNaN(amount)) {
    throw new functions.https.HttpsError("invalid-argument", "amount required");
  }

  const item: Item = {
    id: Date.now().toString(),
    name: String(name).trim(),
    amount,
    timestamp: Date.now(),
  };

  const tripRef = await getFinanceDocRef(uid, tripId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(tripRef);
    const data = snap.data() || {};
    const finance: FinanceState = data.finance || {
      budget: 0,
      categories: [],
    };
    const cat = finance.categories.find((c) => c.id === categoryId);
    if (!cat) throw new functions.https.HttpsError("not-found", "Category not found");
    cat.items = [item, ...cat.items];
    tx.update(tripRef, {finance});
  });

  return item;
});

export const deleteTransaction = functions.https.onCall(async (request) => {
  const uid = request.data?.userId || request.auth?.uid;
  const tripId = request.data?.tripId;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "User ID required");
  if (!tripId) throw new functions.https.HttpsError("invalid-argument", "Trip ID required");
  const {categoryId, itemId} = request.data || {};
  if (!categoryId || !itemId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "categoryId and itemId required"
    );
  }

  const tripRef = await getFinanceDocRef(uid, tripId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(tripRef);
    const data = snap.data() || {};
    const finance: FinanceState = data.finance || {
      budget: 0,
      categories: [],
    };
    const cat = finance.categories.find((c) => c.id === categoryId);
    if (!cat) throw new functions.https.HttpsError("not-found", "Category not found");
    cat.items = cat.items.filter((it) => it.id !== itemId);
    tx.update(tripRef, {finance});
  });

  return {categoryId, itemId};
});

export const editTransaction = functions.https.onCall(async (request) => {
  const uid = request.data?.userId || request.auth?.uid;
  const tripId = request.data?.tripId;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "User ID required");
  if (!tripId) throw new functions.https.HttpsError("invalid-argument", "Trip ID required");
  const {categoryId, item} = request.data || {};
  if (!categoryId || !item || !item.id) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "categoryId and item with id required"
    );
  }

  const tripRef = await getFinanceDocRef(uid, tripId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(tripRef);
    const data = snap.data() || {};
    const finance: FinanceState = data.finance || {
      budget: 0,
      categories: [],
    };
    const cat = finance.categories.find((c) => c.id === categoryId);
    if (!cat) throw new functions.https.HttpsError("not-found", "Category not found");
    cat.items = cat.items.map((it) =>
      it.id === item.id ? {...it, ...item} : it
    );
    tx.update(tripRef, {finance});
  });

  return item;
});
