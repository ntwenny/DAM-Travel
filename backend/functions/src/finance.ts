import * as functions from "firebase-functions";
import {firestore} from "firebase-admin";
import {FinanceState, Category, Item} from "./types/finance";

const db = firestore();

const DEFAULT_FINANCE: FinanceState = {
  budget: 0,
  categories: [],
};

// Helper to get or create a finance state for the user
async function getFinanceDocRef(uid: string) {
  const userRef = db.collection("users").doc(uid);
  return userRef;
}

export const getFinance = functions.https.onCall(async (request) => {
  const uid = request.data?.userId || request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "User ID required");
  }
  const userRef = await getFinanceDocRef(uid);
  const snap = await userRef.get();
  const data = snap.data() || {};
  const finance: FinanceState = data.finance || DEFAULT_FINANCE;
  return finance;
});

export const updateBudget = functions.https.onCall(async (request) => {
  const uid = request.data?.userId || request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "User ID required");
  const budget = Number(request.data?.budget ?? NaN);
  if (Number.isNaN(budget) || budget < 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Budget must be a non-negative number"
    );
  }

  const userRef = await getFinanceDocRef(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.data() || {};
    const finance: FinanceState = data.finance || {
      budget: 0,
      categories: [],
    };
    finance.budget = budget;
    tx.update(userRef, {finance});
  });
  return {budget};
});

export const addCategory = functions.https.onCall(async (request) => {
  const uid = request.data?.userId || request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "User ID required");
  const name = (request.data?.name || "").trim();
  if (!name) {
    throw new functions.https.HttpsError("invalid-argument", "Category name required");
  }

  const id = Date.now().toString();
  const newCategory: Category = {id, name, items: []};

  const userRef = await getFinanceDocRef(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.data() || {};
    const finance: FinanceState = data.finance || {
      budget: 0,
      categories: [],
    };
    finance.categories = [newCategory, ...finance.categories];
    tx.update(userRef, {finance});
  });

  return newCategory;
});

export const deleteCategory = functions.https.onCall(async (request) => {
  const uid = request.data?.userId || request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "User ID required");
  const id = String(request.data?.id || "");
  if (!id) throw new functions.https.HttpsError("invalid-argument", "Category id required");

  const userRef = await getFinanceDocRef(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.data() || {};
    const finance: FinanceState = data.finance || {
      budget: 0,
      categories: [],
    };
    finance.categories = finance.categories.filter((c) => c.id !== id);
    tx.update(userRef, {finance});
  });

  return {id};
});

export const addTransaction = functions.https.onCall(async (request) => {
  const uid = request.data?.userId || request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "User ID required");
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

  const userRef = await getFinanceDocRef(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.data() || {};
    const finance: FinanceState = data.finance || {
      budget: 0,
      categories: [],
    };
    const cat = finance.categories.find((c) => c.id === categoryId);
    if (!cat) throw new functions.https.HttpsError("not-found", "Category not found");
    cat.items = [item, ...cat.items];
    tx.update(userRef, {finance});
  });

  return item;
});

export const deleteTransaction = functions.https.onCall(async (request) => {
  const uid = request.data?.userId || request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "User ID required");
  const {categoryId, itemId} = request.data || {};
  if (!categoryId || !itemId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "categoryId and itemId required"
    );
  }

  const userRef = await getFinanceDocRef(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.data() || {};
    const finance: FinanceState = data.finance || {
      budget: 0,
      categories: [],
    };
    const cat = finance.categories.find((c) => c.id === categoryId);
    if (!cat) throw new functions.https.HttpsError("not-found", "Category not found");
    cat.items = cat.items.filter((it) => it.id !== itemId);
    tx.update(userRef, {finance});
  });

  return {categoryId, itemId};
});

export const editTransaction = functions.https.onCall(async (request) => {
  const uid = request.data?.userId || request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "User ID required");
  const {categoryId, item} = request.data || {};
  if (!categoryId || !item || !item.id) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "categoryId and item with id required"
    );
  }

  const userRef = await getFinanceDocRef(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
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
    tx.update(userRef, {finance});
  });

  return item;
});
