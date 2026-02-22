import 'server-only'
import { getSettings as getDbSettings, type AppSettings } from './db'

// Re-export the type
export type { AppSettings }

// Get settings from database (server-side only)
export async function getSettings(): Promise<AppSettings> {
  return await getDbSettings()
}

// Build settings object compatible with old code shape (for server components)
export async function getSettingsCompat() {
  const s = await getDbSettings()
  return {
    restaurant: {
      name: s.restaurantName,
      address: s.restaurantAddress,
      phone: s.restaurantPhone,
      tagline: s.restaurantTagline,
    },
    currency: {
      symbol: s.currencySymbol,
      code: s.currencyCode,
      locale: s.currencyLocale,
    },
    tax: {
      enabled: s.taxEnabled,
      rate: s.taxRate,
      label: s.taxLabel,
    },
    tables: {
      count: s.tableCount,
    },
  }
}

// Helper to format price — server-side version
export async function formatPriceServer(amount: number): Promise<string> {
  const s = await getDbSettings()
  return new Intl.NumberFormat(s.currencyLocale, {
    style: 'currency',
    currency: s.currencyCode,
    minimumFractionDigits: 2,
  }).format(amount)
}
