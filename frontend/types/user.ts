export interface Trip {
    id: string;
    name: string;
    location: string; // country ISO2 code
    currency: string; // currency code
    budget: number;
    startDate: Date;
    endDate: Date;
}

export interface ShoppingDetectionItem {
    pages: Array<{
        name: string;
        productPage: string; // product page URL
        thumbnail?: string; // image url that matched
        extractedPrice?: number;
        source?: string; // source of the link (vision:web, google, etc.)
        extensions: Array<string>;
    }>;
}

export interface ShoppingPage {
    name: string;
    productPage: string; // product page URL
    thumbnail?: string; // image url that matched
    extractedPrice?: number;
    source?: string; // source of the link (vision:web, google, etc.)
    extensions?: Array<string>;
}

export interface TripItem {
    id: string;
    name: string;
    price: number;
    currency?: string;
    thumbnail?: string;
    productPage?: string;
    source?: string;
    _items?: ShoppingDetectionItem;
    parsingStatus?: "NOT_READY" | "PARSING" | "PARSED" | "FAILED";
}

export interface TripLink {
    productPage: string;
    imageUrl?: string;
    extractedPrice?: number;
    currency?: string;
    category?: string;
    source?: string;
    tags?: string[];
    title?: string;
}

export interface ShoppingCart {
    items: TripItem[];
    total: number;
}

export interface Receipt {
    items: TripItem[];
    subtotal: number;
    tax: number;
    serviceFee: number;
    total: number;
    currency: string;
    country: string;
}
export interface UserProperties {
    email: string;
    displayName: string;
    photoURL: string;

    currentTripId?: string;
    trips: Trip[];
}
