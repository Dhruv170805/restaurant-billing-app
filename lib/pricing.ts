// Client-safe utility functions — no server-only imports here

/**
 * Format a price for display using Intl.NumberFormat.
 * Pass the locale and currencyCode from API-fetched settings.
 * Includes a safe fallback in case the DB settings are incomplete or unloaded.
 */
export function formatPriceWithSettings(
  amount: number,
  locale: string | undefined,
  currencyCode: string | undefined
): string {
  const safeLocale = locale || 'en-US'
  const safeCurrency = currencyCode || 'USD'

  try {
    return new Intl.NumberFormat(safeLocale, {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    // Graceful fallback if provided custom locale/currency strings are invalid
    console.warn('Invalid Intl configuration:', error)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }
}

/**
 * Calculate tax given a subtotal and settings.
 * Pass taxEnabled and taxRate from API-fetched settings.
 */
export function calculateTaxWithSettings(
  subtotal: number,
  taxEnabled: boolean,
  taxRate: number
): { tax: number; total: number } {
  if (!taxEnabled || taxRate <= 0) {
    return { tax: 0, total: subtotal }
  }
  const tax = subtotal * taxRate
  return { tax, total: subtotal + tax }
}
