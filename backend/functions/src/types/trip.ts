export interface Trip {
    id: string;
    name: string;
    location: string; // country ISO2 code
    currency: string; // currency code
    budget: number;
    startDate: Date;
    endDate: Date;
}

export interface TripItem {
    id: string;
    name: string;
    price: number;
    currency: string;
    imageUrl?: string;
    notes?: string;
    category?: string;
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
