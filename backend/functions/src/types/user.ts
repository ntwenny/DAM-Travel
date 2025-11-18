import {Trip} from "./trip";
export interface UserProperties {
    email: string;
    displayName: string;
    photoURL: string;

    currentTripId?: string;
    trips: Trip[];
}
