// ── Shared Client-Side Formatting ─────────────────────
// Eliminates duplicate fmtPrice helpers across pages.

import { formatPriceWithSettings } from './pricing'

/** Minimal settings shape needed for formatting */
interface FormatSettings {
    currencyLocale?: string
    currencyCode?: string
    currencySymbol?: string
}

/**
 * Format a price for display using the app's currency settings.
 * Falls back to the settings' currency symbol (not hardcoded '$').
 */
export function fmtPrice(amount: number, settings: FormatSettings | null | undefined): string {
    const num = typeof amount === 'string' ? parseFloat(amount as unknown as string) : amount
    if (!settings?.currencyLocale || !settings?.currencyCode) {
        const symbol = settings?.currencySymbol || '₹'
        return `${symbol}${num.toFixed(2)}`
    }
    return formatPriceWithSettings(num, settings.currencyLocale, settings.currencyCode)
}
