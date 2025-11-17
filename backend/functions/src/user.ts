import { UserProperties } from "@/types/user";
import { firestore } from "firebase-admin";
import { createTripInternal } from "./trip";
import { auth } from "firebase-functions/v1";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v1/https";
import { getStorage } from "firebase-admin/storage";

const database = firestore();

/**
 * Cloud Function triggered when a new Firebase Authentication user is created.
 *
 * Creates a corresponding user profile document in the Firestore "users" collection.
 * The profile is built from the provided user record and uses safe defaults for
 * missing properties (empty strings for email, displayName, photoURL and an empty
 * array for trips).
 *
 * Side effects:
 * - Writes a document to `database.collection("users").doc(user.uid)` with the
 *   assembled UserProperties object.
 * - Logs an error using `logger.error` if the write operation fails (errors are
 *   caught and not re-thrown).
 *
 * @param user - The Firebase Authentication user record for the newly created user.
 * @returns A Promise that resolves when the Firestore write completes.
 */
export const onUserCreate = auth.user().onCreate(async (user) => {
    const userProfile: UserProperties = {
        email: user.email || "",
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        trips: [],
    };

    try {
        // Create user profile in Firestore
        await database.collection("users").doc(user.uid).set(userProfile);

        // Create a default trip for the new user using shared trip creation helper
        try {
            const now = new Date();
            await createTripInternal(user.uid, {
                name: "My First Trip",
                location: "",
                currency: "",
                budget: 0,
                startDate: now,
                endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            });
        } catch (err) {
            logger.error("Failed to create default trip for user:", err);
        }

        // Create user directory in Storage by adding a placeholder file
        const bucket = getStorage().bucket();
        const userDirPath = `users/${user.uid}/.init`;
        const file = bucket.file(userDirPath);
        await file.save("", {
            metadata: {
                contentType: "text/plain",
                metadata: {
                    createdAt: new Date().toISOString(),
                },
            },
        });

        logger.info(`Created storage directory for user ${user.uid}`);
    } catch (error) {
        logger.error(
            "Error creating user profile or storage directory:",
            error
        );
    }
});

/**
 * Callable Cloud Function that updates the authenticated user's profile document in Firestore.
 *
 * Checks that the caller is authenticated and uses the caller's UID to update the document at
 * `users/{uid}` with the provided partial properties. Any Firestore update error is logged but
 * not rethrown (the function resolves normally after logging). Authentication failures result
 * in an HttpsError with code "unauthenticated".
 *
 * @param request - The callable request object. Expected shape:
 *   - request.auth: Authentication context. Must be present and contain `uid`.
 *   - request.data: Partial<UserProperties> containing fields to merge/update on the user's doc.
 *
 * @throws {HttpsError} Throws an HttpsError with code "unauthenticated" when `request.auth` is undefined.
 *
 * @remarks
 * - Side effects: updates the Firestore document at `users/{uid}` using `update(data)`.
 * - On Firestore update failures the error is logged via `logger.error` and not propagated.
 * - `request.data` is treated as a Partial<UserProperties>; callers should only include fields intended
 *   to be updated.
 */
export const onUserModifyProfile = onCall(async (request) => {
    if (request.auth === undefined) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const data = request.data as Partial<UserProperties>;

    try {
        await database.collection("users").doc(uid).update(data);
    } catch (error) {
        logger.error("Error updating user profile:", error);
    }
});

/**
 * Cloud Function triggered when a Firebase Authentication user is deleted.
 *
 * Deletes the corresponding Firestore document in the "users" collection for the
 * deleted user's UID, and logs any error that occurs during deletion.
 *
 * @param user - The deleted user record provided by the Auth trigger (contains `uid`).
 * @returns A Promise that resolves when the deletion has been attempted (void). Errors are caught and logged.
 *
 * @remarks
 * - Assumes a Firestore instance is available as `database` and a logging utility as `logger`.
 * - Errors are handled inside the function to prevent propagation to the Auth trigger.
 */
export const onUserDelete = auth.user().onDelete(async (user) => {
    try {
        await database.collection("users").doc(user.uid).delete();
        // Remove all storage objects under the user's prefix
        try {
            const bucket = getStorage().bucket();
            // deleteFiles will remove all objects under the prefix
            await bucket.deleteFiles({ prefix: `users/${user.uid}/` });
            logger.info(`Deleted storage files for user ${user.uid}`);
        } catch (err) {
            logger.error("Failed to delete storage files for user:", err);
        }
    } catch (error) {
        logger.error("Error deleting user profile:", error);
    }
});
