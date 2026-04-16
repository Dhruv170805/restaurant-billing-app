import { query } from './postgres';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env

/**
 * Universal SaaS Seeder: NEXUS Platform Baseline.
 * Provisions baseline data in BOTH MongoDB (Frontend) and PostgreSQL (NestJS HQ).
 */
async function seed() {
  console.log('🚀 NEXUS Seeder: Initializing Hybrid Platform Baseline...');
  
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_db';
  const pgUrl = process.env.POSTGRES_URL || 'postgresql://nexus_admin:nexus_secret_change_me@localhost:5432/restaurant_saas';

  try {
    // ── 1. Seed MongoDB (Delivery Plane) ───────────────────────────────────
    console.log('🍃 Seeding MongoDB (Frontend Plane)...');
    const mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    const mongoDb = mongoClient.db();
    
    await mongoDb.collection('tenants').updateOne(
      { slug: 'default' },
      { 
        $setOnInsert: { 
          _id: 'default',
          slug: 'default',
          name: 'NEXUS Standard Tenant',
          theme: { primary: '#f37c22', accent: '#ffffff', font: 'Inter' },
          config: { 
            currencySymbol: '₹', currencyCode: 'INR', currencyLocale: 'en-IN',
            taxEnabled: true, taxRate: 5, taxLabel: 'GST', maxTables: 12
          },
          plan: 'pro',
          suspended: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } 
      },
      { upsert: true }
    );
    console.log('✅ MongoDB: "default" tenant synchronized.');
    await mongoClient.close();

    // ── 2. Seed PostgreSQL (Control Plane) ──────────────────────────────────
    // Note: We skip PG if ECONNREFUSED for dev environments without local Docker
    console.log('🐘 Seeding PostgreSQL (Control Plane)...');
    try {
      await query('SYSTEM', `
        INSERT INTO tenants (id, slug, name, config) 
        VALUES ('00000000-0000-0000-0000-000000000000', 'default', 'System Default', '{}') 
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      `);

      const hashedPass = await bcrypt.hash('GOD_MODE_ACTIVE_2026', 12);
      await query('SYSTEM', `
        INSERT INTO users (id, email, password, name, role, tenant_id)
        VALUES ('f0000000-0000-0000-0000-000000000000', 'superadmin@nexus.com', $1, 'Platform Owner', 'superadmin', '00000000-0000-0000-0000-000000000000')
        ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'superadmin'
      `, [hashedPass]);
      console.log('✅ PostgreSQL: Executive owner synchronized.');
    } catch (pgErr: any) {
      if (pgErr.code === 'ECONNREFUSED') {
        console.warn('⚠️  PostgreSQL unreachable. Control Plane will require local Docker Postgres.');
      } else {
        throw pgErr;
      }
    }

    console.log('\n✨ NEXUS Seeder: Hybrid synchronization complete.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ NEXUS Seeder: Sync Failed:', err);
    process.exit(1);
  }
}

seed();
