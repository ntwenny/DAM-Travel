import { HttpsError, onCall } from "firebase-functions/v1/https";
import { firestore } from "firebase-admin";
import { FinanceState, Category, Item } from "./types/finance";

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

export const getFinance = onCall(async (request) => {
    if (!request || !request.auth || !request.auth.uid) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const userRef = await getFinanceDocRef(uid);
    const snap = await userRef.get();
    const data = snap.data() || {};
    const finance: FinanceState = data.finance || DEFAULT_FINANCE;
    return finance;
});

export const updateBudget = onCall(async (request) => {
    if (!request || !request.auth || !request.auth.uid) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const uid = request.auth.uid;
    const budget = Number(request.data?.budget ?? NaN);
    if (Number.isNaN(budget) || budget < 0) {
        throw new HttpsError(
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
        tx.update(userRef, { finance });
    });
    return { budget };
});

export const addCategory = onCall(async (request) => {
    if (!request || !request.auth || !request.auth.uid) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const uid = request.auth.uid;
    const name = (request.data?.name || "").trim();
    if (!name) {
        throw new HttpsError("invalid-argument", "Category name required");
    }

    const id = Date.now().toString();
    const newCategory: Category = { id, name, items: [] };

    const userRef = await getFinanceDocRef(uid);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const data = snap.data() || {};
        const finance: FinanceState = data.finance || {
            budget: 0,
            categories: [],
        };
        finance.categories = [newCategory, ...finance.categories];
        tx.update(userRef, { finance });
    });

    return newCategory;
});

export const deleteCategory = onCall(async (request) => {
    if (!request || !request.auth || !request.auth.uid) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const uid = request.auth.uid;
    const id = String(request.data?.id || "");
    if (!id) throw new HttpsError("invalid-argument", "Category id required");

    const userRef = await getFinanceDocRef(uid);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const data = snap.data() || {};
        const finance: FinanceState = data.finance || {
            budget: 0,
            categories: [],
        };
        finance.categories = finance.categories.filter((c) => c.id !== id);
        tx.update(userRef, { finance });
    });

    return { id };
});

export const addTransaction = onCall(async (request) => {
    if (!request || !request.auth || !request.auth.uid) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const uid = request.auth.uid;
    const { categoryId, name } = request.data || {};
    const amount = Number(request.data?.amount ?? NaN);
    if (!categoryId)
        throw new HttpsError("invalid-argument", "categoryId required");
    if (!name || String(name).trim() === "")
        throw new HttpsError("invalid-argument", "name required");
    if (Number.isNaN(amount))
        throw new HttpsError("invalid-argument", "amount required");

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
        if (!cat) throw new HttpsError("not-found", "Category not found");
        cat.items = [item, ...cat.items];
        tx.update(userRef, { finance });
    });

    return item;
});

export const deleteTransaction = onCall(async (request) => {
    if (!request || !request.auth || !request.auth.uid) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const uid = request.auth.uid;
    const { categoryId, itemId } = request.data || {};
    if (!categoryId || !itemId)
        throw new HttpsError(
            "invalid-argument",
            "categoryId and itemId required"
        );

    const userRef = await getFinanceDocRef(uid);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const data = snap.data() || {};
        const finance: FinanceState = data.finance || {
            budget: 0,
            categories: [],
        };
        const cat = finance.categories.find((c) => c.id === categoryId);
        if (!cat) throw new HttpsError("not-found", "Category not found");
        cat.items = cat.items.filter((it) => it.id !== itemId);
        tx.update(userRef, { finance });
    });

    return { categoryId, itemId };
});

export const editTransaction = onCall(async (request) => {
    if (!request || !request.auth || !request.auth.uid) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const uid = request.auth.uid;
    const { categoryId, item } = request.data || {};
    if (!categoryId || !item || !item.id)
        throw new HttpsError(
            "invalid-argument",
            "categoryId and item with id required"
        );

    const userRef = await getFinanceDocRef(uid);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const data = snap.data() || {};
        const finance: FinanceState = data.finance || {
            budget: 0,
            categories: [],
        };
        const cat = finance.categories.find((c) => c.id === categoryId);
        if (!cat) throw new HttpsError("not-found", "Category not found");
        cat.items = cat.items.map((it) =>
            it.id === item.id ? { ...it, ...item } : it
        );
        tx.update(userRef, { finance });
    });

    return item;
});
