import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "./useAuth";
import { firestore } from "@/lib/firebase";
import { UserProperties } from "@/types/user";

export function useUser() {
    const { user } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProperties | null>(null);

    useEffect(() => {
        if (user) {
            const userDocRef = doc(firestore, "users", user.uid);
            const unsubscribe = onSnapshot(userDocRef, (doc) => {
                setUserProfile(doc.data() as UserProperties);
            });
            return () => unsubscribe();
        } else {
            setUserProfile(null);
        }
    }, [user]);

    return { user, userProfile };
}
