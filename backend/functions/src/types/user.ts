export enum TripItemParsingStatus {
    UNPARSED = "UNPARSED",
    PARSING = "PARSING",
    PARSED = "PARSED",
    ERROR = "ERROR",
}
export interface TripItem {
    id: string;
    photo: string;
    description: string;
    date: string;
    price: number;

    parsingStatus: TripItemParsingStatus;
    rawDetectionData: any;
}

export interface Trip {
    id: string;
    name: string;

    destination: string;
    startDate: string;
    endDate: string;

    totalBudget: number;
    items: TripItem[];
}

export interface UserProperties {
    email: string;
    displayName: string;
    photoURL: string;

    currentTripId?: string;
    trips: Trip[];
}
