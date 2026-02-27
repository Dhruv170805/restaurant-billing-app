import { ensureInitialized } from './mongo'
import { AppSettings } from '@/lib/db'
import { DbSettings } from './schema'

export async function getSettings(): Promise<AppSettings> {
  const db = await ensureInitialized()
  // Default fallback values
  const defaultSettings: AppSettings = {
    restaurantName: 'Restaurant',
    restaurantAddress: '',
    restaurantPhone: '',
    restaurantTagline: '',
    currencyLocale: 'en-IN',
    currencyCode: 'INR',
    currencySymbol: '₹',
    taxEnabled: false,
    taxRate: 0,
    taxLabel: 'GST',
    tableCount: 12,
    timezone: 'Asia/Kolkata',
    ownerPhone: '',
    _id: 'app_settings',
  } as AppSettings

  const settingsDoc = await db.collection<DbSettings>('settings').findOne({ _id: 'app_settings' })
  if (!settingsDoc) return defaultSettings

  return {
    restaurantName: settingsDoc.restaurantName ?? defaultSettings.restaurantName,
    restaurantAddress: settingsDoc.restaurantAddress ?? defaultSettings.restaurantAddress,
    restaurantPhone: settingsDoc.restaurantPhone ?? defaultSettings.restaurantPhone,
    restaurantTagline: settingsDoc.restaurantTagline ?? defaultSettings.restaurantTagline,
    currencyLocale: settingsDoc.currencyLocale ?? defaultSettings.currencyLocale,
    currencyCode: settingsDoc.currencyCode ?? defaultSettings.currencyCode,
    currencySymbol: settingsDoc.currencySymbol ?? defaultSettings.currencySymbol,
    taxEnabled: settingsDoc.taxEnabled ?? defaultSettings.taxEnabled,
    taxRate: Number(settingsDoc.taxRate) ?? defaultSettings.taxRate,
    taxLabel: settingsDoc.taxLabel ?? defaultSettings.taxLabel,
    tableCount: Number(settingsDoc.tableCount) ?? defaultSettings.tableCount,
    timezone: settingsDoc.timezone ?? defaultSettings.timezone,
    ownerPhone: settingsDoc.ownerPhone ?? defaultSettings.ownerPhone,
    _id: settingsDoc._id ?? defaultSettings._id,
  } as AppSettings
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  const db = await ensureInitialized()
  await db
    .collection<DbSettings>('settings')
    .updateOne({ _id: 'app_settings' }, { $set: updates }, { upsert: true })
  return getSettings()
}
