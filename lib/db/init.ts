import { Db } from 'mongodb'
import { DbCategory, DbMenuItem, DbSettings } from './schema'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { getNextSequence } from './mongo'

export async function initializeSchema(db: Db): Promise<void> {
  // Create collections if they don't exist (MongoDB handles this dynamically, but we can explicitly create them)
  const collections = await db.listCollections().toArray()
  const collectionNames = collections.map((c) => c.name)

  if (!collectionNames.includes('categories')) await db.createCollection('categories')
  if (!collectionNames.includes('menu_items')) await db.createCollection('menu_items')
  if (!collectionNames.includes('orders')) await db.createCollection('orders')
  if (!collectionNames.includes('customers')) await db.createCollection('customers')
  if (!collectionNames.includes('settings')) await db.createCollection('settings')
  if (!collectionNames.includes('counters')) await db.createCollection('counters')

  // Optional: Create indexes
  await db.collection('orders').createIndex({ status: 1 })
  await db.collection('orders').createIndex({ tableNumber: 1 })
  await db.collection('orders').createIndex({ createdAt: -1 })

  // Set up 7-day Auto-Delete (TTL) only for PAID orders
  await db.collection('orders').createIndex(
    { createdAt: 1 },
    {
      expireAfterSeconds: 7 * 24 * 60 * 60, // 7 days in seconds
      partialFilterExpression: { status: 'PAID' },
      name: 'ttl_paid_orders_7_days'
    }
  )

  await seedFromJson(db)
  await seedDefaultSettings(db)
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
      await db.collection<DbCategory>('categories').insertOne({ _id: id, name: cat.name })
      catMap.set(cat.name, id)
    }

    for (const item of data.items) {
      const catId = catMap.get(item.category)
      if (catId) {
        const id = await getNextSequence('menuItemId')
        await db.collection<DbMenuItem>('menu_items').insertOne({
          _id: id,
          name: item.name,
          price: item.price,
          categoryId: catId,
        })
      }
    }

    console.log('✅ Seeded MongoDB from menu.json')
  } catch (err) {
    console.error('Failed to seed from menu.json:', err)
  }
}

async function seedDefaultSettings(db: Db): Promise<void> {
  const count = await db.collection('settings').countDocuments()
  if (count > 0) return

  const defaults = {
    _id: 'app_settings',
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
  }

  try {
    await db.collection<DbSettings>('settings').insertOne(defaults as DbSettings)
    console.log('✅ Seeded default settings in MongoDB')
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: number }).code === 11000
    ) {
      // Ignore duplicate key errors, another worker already inserted it
      console.log('ℹ️ Default settings already exist')
    } else {
      console.error('Failed to seed default settings:', err)
      throw err
    }
  }
}
