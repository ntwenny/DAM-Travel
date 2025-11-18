import { Platform } from "react-native";
import { initializeApp, registerVersion } from "firebase/app";
import {
    connectFunctionsEmulator,
    getFunctions,
    httpsCallable,
} from "firebase/functions";
import {
    connectAuthEmulator,
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    type User,
    type Unsubscribe,
} from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import type { CartItem } from "@/types/user";

/**
 * Minimal firebase initialization for the client.
 * - Uses a small placeholder config so the SDK is usable for emulator-based calls.
 * - If you run against the emulator locally, set `USE_FIREBASE_EMULATOR=true` in your environment
 *   (or flip the `USE_EMULATOR` constant below).
 *
 * Note: On a real device/emulator you should supply real Firebase config from your project.
 */

const firebaseConfig = {
    apiKey: "AIzaSyDnk4ePtnUBq5yR8M6JWjA3N5hz4z3yUHE",

    authDomain: "dam-travel.firebaseapp.com",

    projectId: "dam-travel",

    storageBucket: "dam-travel.firebasestorage.app",

    messagingSenderId: "985066489591",

    appId: "1:985066489591:web:34b13f9a3e2b74073a75f2",
};

const app = initializeApp(firebaseConfig);

const functions = getFunctions(app);
registerVersion("auth", "0.0.1");
const auth = getAuth(app);
export { auth };
export const storage = getStorage(app);
export const firestore = getFirestore(app);

// If you're running the emulator, enable this. On device you may need to use your machine IP.
const USE_EMULATOR = false; // flip to false for production
if (USE_EMULATOR) {
    // default emulator host/port for functions is localhost:5001
    // If running on Android emulator use 10.0.2.2, on iOS simulator localhost works.
    // Adjust HOST if you run the emulator on a different address.
    const HOST = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
    const FUNCTIONS_PORT = 5001;
    const AUTH_PORT = 9099;
    const STORAGE_PORT = 9199;
    const FIRESTORE_PORT = 8080;
    try {
        connectFunctionsEmulator(functions, HOST, FUNCTIONS_PORT);
        // eslint-disable-next-line no-console
        console.log(
            `Connected functions to emulator at ${HOST}:${FUNCTIONS_PORT}`
        );
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Failed to connect functions emulator", err);
    }

    try {
        connectAuthEmulator(auth, `http://${HOST}:${AUTH_PORT}`, {
            disableWarnings: true,
        });
        // eslint-disable-next-line no-console
        console.log(`Connected auth to emulator at ${HOST}:${AUTH_PORT}`);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Failed to connect auth emulator", err);
    }

    try {
        connectStorageEmulator(storage, HOST, STORAGE_PORT);
        // eslint-disable-next-line no-console
        console.log(`Connected storage to emulator at ${HOST}:${STORAGE_PORT}`);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Failed to connect storage emulator", err);
    }

    try {
        connectFirestoreEmulator(firestore, HOST, FIRESTORE_PORT);
        // eslint-disable-next-line no-console
        console.log(
            `Connected firestore to emulator at ${HOST}:${FIRESTORE_PORT}`
        );
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Failed to connect firestore emulator", err);
    }
}

export async function getTrips() {
    const callable = httpsCallable<void, { trips?: any[] }>(
        functions,
        "getTrips"
    );
    const res = await callable();
    return res.data?.trips ?? [];
}

export async function createTrip(
    params: { name?: string; location?: string } = {}
) {
    const callable = httpsCallable(functions, "createTrip");
    const res = await callable(params);
    return res.data;
}

export async function getFinance() {
    const callable = httpsCallable(functions, "getFinance");
    const res = await callable();
    return res.data as any;
}

export async function getTripItems(tripId: string) {
    const callable = httpsCallable(functions, "getTripItems");
    const res = await callable({ tripId });
    return res.data as any[];
}

export async function getTripItem(tripId: string, tripItemId: string) {
    const callable = httpsCallable(functions, "getTripItem");
    const res = await callable({ tripId, tripItemId });
    return res.data as any;
}

export async function updateUserProfile(data: {
    displayName?: string;
    photoURL?: string;
    email?: string;
}) {
    const callable = httpsCallable(functions, "updateUser");
    const res = await callable(data);
    return res.data;
}

export async function updateTripItem(
    tripId: string,
    tripItemId: string,
    data: any
) {
    const callable = httpsCallable(functions, "updateTripItem");
    await callable({ tripId, tripItemId, ...data });
}

export async function addCartItemToTrip(
    tripId: string,
    tripItemId: string,
    quantity = 1
) {
    const callable = httpsCallable(functions, "addCartItem");
    const res = await callable({ tripId, tripItemId, quantity });
    return res.data as CartItem;
}

export async function removeCartItemFromTrip(
    tripId: string,
    tripItemId: string
) {
    const callable = httpsCallable(functions, "removeCartItem");
    await callable({ tripId, tripItemId });
}

export async function updateCartQuantity(
    tripId: string,
    tripItemId: string,
    quantity: number
) {
    const callable = httpsCallable(functions, "updateCartItemQuantity");
    const res = await callable({ tripId, tripItemId, quantity });
    return res.data as CartItem;
}

export async function getCart(tripId: string) {
    const callable = httpsCallable(functions, "getCartItems");
    const res = await callable({ tripId });
    return res.data as { items: CartItem[]; total: number };
}

export async function clearCartItems(tripId: string) {
    const callable = httpsCallable(functions, "clearCart");
    const res = await callable({ tripId });
    return res.data as { removed: number };
}

// Build a receipt for a set of items in a trip (server-computed totals)
export async function createReceiptForTrip(
    tripId: string,
    items: Array<Record<string, unknown>>
): Promise<{
    items: any[];
    subtotal: number;
    tax: number;
    serviceFee: number;
    total: number;
    currency?: string;
    country?: string;
}> {
    const callable = httpsCallable(functions, "createReceipt");
    const res = await callable({ tripId, items });
    return res.data as any;
}

export async function updateBudget(budget: number) {
    const callable = httpsCallable(functions, "updateBudget");
    await callable({ budget });
}

export async function addCategory(name: string) {
    const callable = httpsCallable(functions, "addCategory");
    const res = await callable({ name });
    return res.data;
}

export async function deleteCategory(id: string) {
    const callable = httpsCallable(functions, "deleteCategory");
    await callable({ id });
}

export async function addTransaction(
    categoryId: string,
    name: string,
    amount: number
) {
    const callable = httpsCallable(functions, "addTransaction");
    const res = await callable({ categoryId, name, amount });
    return res.data;
}

export async function deleteTransaction(categoryId: string, itemId: string) {
    const callable = httpsCallable(functions, "deleteTransaction");
    await callable({ categoryId, itemId });
}

export async function editTransaction(categoryId: string, item: any) {
    const callable = httpsCallable(functions, "editTransaction");
    await callable({ categoryId, item });
}

export function observeAuthState(
    callback: (user: User | null) => void
): Unsubscribe {
    return onAuthStateChanged(auth, callback);
}

export function signInWithEmail(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
}

export function signUpWithEmail(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
}

export function signOutCurrentUser() {
    return signOut(auth);
}

export async function setCurrentTrip(tripId: string) {
    const callable = httpsCallable(functions, "setCurrentTrip");
    const res = await callable({ tripId });
    return res.data as { currentTripId: string };
}

export default {
    auth,
    observeAuthState,
    signInWithEmail,
    signUpWithEmail,
    signOutCurrentUser,
    getTrips,
    createTrip,
    getFinance,
    getTripItems,
    getTripItem,
    updateTripItem,
    setCurrentTrip,
    updateBudget,
    addCategory,
    deleteCategory,
    addTransaction,
    deleteTransaction,
    editTransaction,
    createReceiptForTrip,
    storage,
    firestore,
};
