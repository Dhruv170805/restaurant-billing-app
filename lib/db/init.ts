import { Db } from 'mongodb'
import { DbCategory, DbMenuItem, DbSettings, DbTenant } from './schema'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { getNextSequence } from './mongo'

export async function initializeSchema(db: Db): Promise<void> {
  const collections = await db.listCollections().toArray()
  const names = collections.map((c) => c.name)

  // ── Original collections ──────────────────────────────────────────────────
  if (!names.includes('categories')) await db.createCollection('categories')
  if (!names.includes('menu_items')) await db.createCollection('menu_items')
  if (!names.includes('orders')) await db.createCollection('orders')
  if (!names.includes('customers')) await db.createCollection('customers')
  if (!names.includes('settings')) await db.createCollection('settings')
  if (!names.includes('counters')) await db.createCollection('counters')

  // ── New multi-tenant collections ──────────────────────────────────────────
  if (!names.includes('tenants')) await db.createCollection('tenants')
  if (!names.includes('users')) await db.createCollection('users')
  if (!names.includes('audit_logs')) await db.createCollection('audit_logs')

  // ── Existing indexes ──────────────────────────────────────────────────────
  await db.collection('orders').createIndex({ status: 1 })
  await db.collection('orders').createIndex({ tableNumber: 1 })
  await db.collection('orders').createIndex({ createdAt: -1 })

  // TTL: auto-delete PAID orders after 7 days
  await db.collection('orders').createIndex(
    { createdAt: 1 },
    {
      expireAfterSeconds: 7 * 24 * 60 * 60,
      partialFilterExpression: { status: 'PAID' },
      name: 'ttl_paid_orders_7_days',
    }
  )

  // ── Multi-tenant compound indexes ─────────────────────────────────────────
  await db.collection('orders').createIndex({ tenantId: 1, createdAt: -1 })
  await db.collection('orders').createIndex({ tenantId: 1, status: 1 })
  await db.collection('menu_items').createIndex({ tenantId: 1 })
  await db.collection('categories').createIndex({ tenantId: 1 })
  await db.collection('customers').createIndex({ tenantId: 1 })
  await db.collection('settings').createIndex({ tenantId: 1 })

  // ── User indexes ──────────────────────────────────────────────────────────
  await db.collection('users').createIndex(
    { tenantId: 1, email: 1 },
    { unique: true, name: 'unique_user_per_tenant' }
  )

  // ── Tenant indexes ────────────────────────────────────────────────────────
  await db.collection('tenants').createIndex({ slug: 1 }, { unique: true })
  await db.collection('tenants').createIndex({ domain: 1 }, { sparse: true })

  // ── Audit log: TTL 90 days ────────────────────────────────────────────────
  await db.collection('audit_logs').createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60, name: 'ttl_audit_logs_90_days' }
  ).catch(e => {
    if (e.code === 85) {
      console.log('⚠️ Audit TTL index exists with a different name. Ignoring during init.');
    } else {
      console.log('⚠️ Could not create audit_logs index:', e.message);
    }
  })
  await db.collection('audit_logs').createIndex({ tenantId: 1, createdAt: -1 })

  await seedFromJson(db)
  await seedDefaultTenantAndSettings(db)
}

async function seedFromJson(db: Db): Promise<void> {
  const count = await db.collection('categories').countDocuments()
  if (count > 0) return

  const DATA_DIR = join(process.cwd(), 'data')
  const menuJsonPath = join(DATA_DIR, 'menu.json')
  if (!existsSync(menuJsonPath)) return

  try {
    const raw = readFileSync(menuJsonPath, 'utf-8')
    const data = JSON.parse(raw)
    const catMap = new Map<string, number>()

    for (const cat of data.categories) {
      const id = await getNextSequence('categoryId')
      await db.collection<DbCategory>('categories').insertOne({ _id: id, tenantId: 'default', name: cat.name })
      catMap.set(cat.name, id)
    }

    for (const item of data.items) {
      const catId = catMap.get(item.category)
      if (catId) {
        const id = await getNextSequence('menuItemId')
        await db.collection<DbMenuItem>('menu_items').insertOne({
          _id: id,
          tenantId: 'default',
          name: item.name,
          price: item.price,
          categoryId: catId,
        })
      }
    }
    console.log('✅ Seeded MongoDB from menu.json (tenantId: default)')
  } catch (err) {
    console.error('Failed to seed from menu.json:', err)
  }
}

async function seedDefaultTenantAndSettings(db: Db): Promise<void> {
  // ── Tenant ─────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantExists = await db.collection('tenants').countDocuments({ _id: 'default' } as any)
  if (tenantExists === 0) {
    const now = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.collection('tenants') as any).insertOne({
      _id: 'default',
      slug: 'default',
      name: 'Shreeji',
      theme: { primary: '#f37c22', accent: '#ffffff', font: 'Inter' },
      config: {
        taxEnabled: false,
        taxRate: 0,
        taxLabel: 'GST',
        currencySymbol: '₹',
        currencyCode: 'INR',
        currencyLocale: 'en-IN',
        maxTables: 12,
        maxMenuItems: 9999,
      },
      plan: 'pro',
      suspended: false,
      createdAt: now,
      updatedAt: now,
    })
    console.log('✅ Default tenant seeded')
  }

  // ── Settings (legacy compat) ───────────────────────────────────────────────
  const settingsExists = await db.collection('settings').countDocuments()
  if (settingsExists === 0) {
    try {
      await db.collection<DbSettings>('settings').insertOne({
        _id: 'app_settings',
        tenantId: 'default',
        restaurantName: 'Shreeji',
        restaurantAddress: 'Rajkot, Gujarat, India',
        restaurantPhone: '+91 98765 43210',
        restaurantTagline: 'Thank you for dining with us! ✨',
        currencySymbol: '₹',
        currencyCode: 'INR',
        currencyLocale: 'en-IN',
        taxEnabled: false,
        taxRate: 0,
        taxLabel: 'GST',
        tableCount: 12,
        timezone: 'Asia/Kolkata',
      } as DbSettings)
      console.log('✅ Default settings seeded')
    } catch (err: unknown) {
      if ((err as { code?: number }).code !== 11000) throw err
    }
  }
}
