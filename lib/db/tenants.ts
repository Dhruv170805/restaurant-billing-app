
import { getDb } from './mongo'
import { getCache, setCache, delCache } from '../redis'
import { DbTenant } from './schema'
import { ObjectId } from 'mongodb'

const TENANT_CACHE_TTL = 60 // seconds

// ── Read ────────────────────────────────────────────────────────────────────

export async function getTenantBySlug(slug: string): Promise<DbTenant | null> {
  const cacheKey = `tenant:slug:${slug}`
  const cached = await getCache<DbTenant>(cacheKey).catch(() => null)
  if (cached) return cached

  const db = await getDb()
  const tenant = await db.collection<DbTenant>('tenants').findOne({ slug })
  if (!tenant) return null

  await setCache(cacheKey, tenant, TENANT_CACHE_TTL).catch(() => {})
  return tenant
}

export async function getTenantByDomain(domain: string): Promise<DbTenant | null> {
  const cacheKey = `tenant:domain:${domain}`
  const cached = await getCache<DbTenant>(cacheKey).catch(() => null)
  if (cached) return cached

  const db = await getDb()
  const tenant = await db.collection<DbTenant>('tenants').findOne({ domain })
  if (!tenant) return null

  await setCache(cacheKey, tenant, TENANT_CACHE_TTL).catch(() => {})
  return tenant
}

export async function getTenantById(id: string): Promise<DbTenant | null> {
  const cacheKey = `tenant:id:${id}`
  const cached = await getCache<DbTenant>(cacheKey).catch(() => null)
  if (cached) return cached

  const db = await getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = await (db.collection('tenants') as any).findOne({ _id: id }) as DbTenant | null
  if (!tenant) return null

  await setCache(cacheKey, tenant, TENANT_CACHE_TTL).catch(() => {})
  return tenant
}

export async function listTenants(): Promise<DbTenant[]> {
  const db = await getDb()
  return db.collection<DbTenant>('tenants').find().sort({ createdAt: -1 }).toArray()
}

// ── Write ────────────────────────────────────────────────────────────────────

export async function createTenant(data: Omit<DbTenant, '_id'>): Promise<DbTenant> {
  const db = await getDb()
  const now = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = {
    ...data,
    _id: data.slug,
    createdAt: now,
    updatedAt: now,
    suspended: data.suspended ?? false,
  } as unknown as DbTenant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.collection('tenants') as any).insertOne(tenant)
  return tenant
}

export async function updateTenant(slug: string, updates: Partial<DbTenant>): Promise<DbTenant | null> {
  const db = await getDb()
  const now = new Date().toISOString()
  const result = await db
    .collection<DbTenant>('tenants')
    .findOneAndUpdate({ slug }, { $set: { ...updates, updatedAt: now } }, { returnDocument: 'after' })

  if (!result) return null
  await invalidateTenantCache(slug)
  return result
}

export async function suspendTenant(slug: string): Promise<void> {
  await updateTenant(slug, { suspended: true })
}

export async function reactivateTenant(slug: string): Promise<void> {
  await updateTenant(slug, { suspended: false })
}

// ── Cache Invalidation ───────────────────────────────────────────────────────

export async function invalidateTenantCache(slug: string): Promise<void> {
  await Promise.allSettled([
    delCache(`tenant:slug:${slug}`),
    delCache(`tenant:id:${slug}`),
  ])
}

// ── Default Tenant Seeding ───────────────────────────────────────────────────

export async function ensureDefaultTenant(settings: {
  restaurantName: string
  address: string
  phone: string
  currencySymbol: string
  currencyCode: string
  currencyLocale: string
  taxEnabled: boolean
  taxRate: number
  taxLabel: string
  tableCount: number
}): Promise<DbTenant> {
  const db = await getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (db.collection('tenants') as any).findOne({ _id: 'default' }) as DbTenant | null
  if (existing) return existing

  const now = new Date().toISOString()
  const tenant = {
    _id: 'default',
    slug: 'default',
    name: settings.restaurantName,
    theme: { primary: '#f37c22', accent: '#ffffff', font: 'Inter' },
    config: {
      taxEnabled: settings.taxEnabled,
      taxRate: settings.taxRate,
      taxLabel: settings.taxLabel,
      currencySymbol: settings.currencySymbol,
      currencyCode: settings.currencyCode,
      currencyLocale: settings.currencyLocale,
      maxTables: settings.tableCount,
      maxMenuItems: 999,
    },
    plan: 'pro' as const,
    suspended: false,
    createdAt: now,
    updatedAt: now,
  } as unknown as DbTenant

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.collection('tenants') as any).insertOne(tenant)
  console.log('✅ Default tenant created')
  return tenant
}
