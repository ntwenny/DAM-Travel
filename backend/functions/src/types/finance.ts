export interface Item {
    id: string;
    name: string;
    amount: number;
    timestamp?: number;
}

export interface Category {
    id: string;
    name: string;
    items: Item[];
}

export interface FinanceState {
    budget: number;
    categories: Category[];
}
