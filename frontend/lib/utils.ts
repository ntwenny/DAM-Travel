import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Map currency codes to their symbols
const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CNY: "¥",
    INR: "₹",
    AUD: "A$",
    CAD: "C$",
    CHF: "Fr",
    KRW: "₩",
    BRL: "R$",
    RUB: "₽",
    MXN: "$",
    ZAR: "R",
    SEK: "kr",
    NOK: "kr",
    DKK: "kr",
    PLN: "zł",
    THB: "฿",
    IDR: "Rp",
    MYR: "RM",
    PHP: "₱",
    SGD: "S$",
    NZD: "NZ$",
    HKD: "HK$",
    TRY: "₺",
    AED: "د.إ",
    SAR: "﷼",
};

/**
 * Get the currency symbol for a given currency code
 * @param currencyCode - ISO 4217 currency code (e.g., "USD", "EUR")
 * @returns The currency symbol (e.g., "$", "€")
 */
export function getCurrencySymbol(currencyCode: string): string {
    return currencySymbols[currencyCode?.toUpperCase()] || currencyCode || "$";
}
