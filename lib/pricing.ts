// Client-safe utility functions — no server-only imports here

/**
 * Format a price for display using Intl.NumberFormat.
 * Pass the locale and currencyCode from API-fetched settings.
 */
export function formatPriceWithSettings(
    amount: number,
    locale: string,
    currencyCode: string,
): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
    }).format(amount)
}

/**
 * Calculate tax given a subtotal and settings.
 * Pass taxEnabled and taxRate from API-fetched settings.
 */
export function calculateTaxWithSettings(
    subtotal: number,
    taxEnabled: boolean,
    taxRate: number,
): { tax: number; total: number } {
    if (!taxEnabled || taxRate <= 0) {
        return { tax: 0, total: subtotal }
    }
    const tax = subtotal * taxRate
    return { tax, total: subtotal + tax }
}
