#!/usr/bin/env node
/**
 * One-time migration script: single-tenant → multi-tenant
 *
 * Run with: node --env-file=.env.local scripts/migrate-to-multitenant.mjs
 *
 * What it does:
 * 1. Stamps all existing documents with tenantId: "default"
 * 2. Creates the "default" tenant record
 * 3. Prompts for a superadmin email + password
 * 4. Creates the superadmin user
 * 5. Prints a login URL
 */

import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import { createInterface } from 'readline'
import { randomBytes } from 'crypto'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_db'

const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise((res) => rl.question(q, res))

async function main() {
  console.log('\n🚀 NEXUS POS — Multi-Tenant Migration Script')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db()

  console.log('✅ Connected to MongoDB:', MONGODB_URI)

  const TENANT_ID = 'default'

  // ── Step 1: Stamp existing documents ───────────────────────────────────────
  const domainCollections = ['orders', 'menu_items', 'categories', 'customers', 'settings']

  for (const col of domainCollections) {
    const result = await db.collection(col).updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: TENANT_ID } }
    )
    console.log(`  📦 ${col}: stamped ${result.modifiedCount} documents with tenantId: "${TENANT_ID}"`)
  }

  // ── Step 2: Create default tenant ─────────────────────────────────────────
  const existingTenant = await db.collection('tenants').findOne({ _id: TENANT_ID })
  if (!existingTenant) {
    const settings = await db.collection('settings').findOne({ _id: 'app_settings' })
    const now = new Date().toISOString()
    await db.collection('tenants').insertOne({
      _id: TENANT_ID,
      slug: TENANT_ID,
      name: settings?.restaurantName || 'My Restaurant',
      theme: { primary: '#f37c22', accent: '#ffffff', font: 'Inter' },
      config: {
        taxEnabled: settings?.taxEnabled ?? false,
        taxRate: settings?.taxRate ?? 0,
        taxLabel: settings?.taxLabel ?? 'GST',
        currencySymbol: settings?.currencySymbol ?? '₹',
        currencyCode: settings?.currencyCode ?? 'INR',
        currencyLocale: settings?.currencyLocale ?? 'en-IN',
        maxTables: settings?.tableCount ?? 12,
        maxMenuItems: 9999,
      },
      plan: 'pro',
      suspended: false,
      createdAt: now,
      updatedAt: now,
    })
    console.log(`  🏪 Default tenant created: "${settings?.restaurantName || 'My Restaurant'}"`)
  } else {
    console.log('  ℹ️  Default tenant already exists, skipping.')
  }

  // ── Step 3: Create superadmin user ─────────────────────────────────────────
  const existingAdmin = await db.collection('users').findOne({ tenantId: TENANT_ID, roles: 'superadmin' })
  if (!existingAdmin) {
    console.log('\n📝 Create your superadmin account:')
    const name = await ask('  Name: ')
    const email = await ask('  Email: ')
    const password = await ask('  Password (min 8 chars): ')

    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters.')
      await client.close()
      rl.close()
      process.exit(1)
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const userId = randomBytes(12).toString('hex')
    const now = new Date().toISOString()

    await db.collection('users').insertOne({
      _id: userId,
      tenantId: TENANT_ID,
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name.trim(),
      roles: ['admin', 'superadmin'],
      refreshTokens: [],
      totpEnabled: false,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    })

    const appUrl = process.env.APP_URL || 'http://localhost:3000'
    console.log('\n✅ Superadmin created!')
    console.log(`\n🔗 Login URL: ${appUrl}/login`)
    console.log(`   Email: ${email}`)
    console.log('   Password: [as entered]\n')
  } else {
    console.log('  ℹ️  Superadmin already exists, skipping user creation.')
  }

  // ── Step 4: Create indexes ──────────────────────────────────────────────────
  console.log('\n🔧 Creating / verifying indexes...')

  await db.collection('users').createIndex({ tenantId: 1, email: 1 }, { unique: true, name: 'unique_user_per_tenant' }).catch(e => console.log('  ⚠️  Could not create users index:', e.message))
  await db.collection('tenants').createIndex({ slug: 1 }, { unique: true }).catch(e => console.log('  ⚠️  Could not create tenants index:', e.message))
  await db.collection('orders').createIndex({ tenantId: 1, createdAt: -1 }).catch(e => console.log('  ⚠️  Could not create orders index:', e.message))
  await db.collection('audit_logs').createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60, name: 'ttl_audit_logs_90d' }
  ).catch(e => {
    // If the index exists with a different name, we can drop it and recreate it, or just ignore.
    if (e.code === 85) {
      console.log('  ⚠️  Audit TTL index exists with a different name. Dropping and recreating.')
      return db.collection('audit_logs').dropIndex('ttl_audit_logs_90_days').catch(() => {}).then(() => 
        db.collection('audit_logs').createIndex({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60, name: 'ttl_audit_logs_90d' })
      ).catch(e2 => console.log('  ⚠️  Still failed:', e2.message))
    }
    console.log('  ⚠️  Could not create audit_logs index:', e.message)
  })

  console.log('  ✅ All indexes verified.\n')

  await client.close()
  rl.close()

  console.log('🎉 Migration complete! Your app is now multi-tenant ready.\n')
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
