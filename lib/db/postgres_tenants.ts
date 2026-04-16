import { query } from './postgres';
import { logger } from '../logger';

export interface PgTenant {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  plan: 'free' | 'starter' | 'pro';
  planExpiresAt: string | null;
  theme: any;
  config: any;
  suspended: boolean;
}

export async function getPgTenantBySlug(slug: string): Promise<PgTenant | null> {
  try {
    const sql = `SELECT * FROM tenants WHERE slug = $1 LIMIT 1`;
    const rows = await query<PgTenant>('SYSTEM', sql, [slug]);
    
    // Fallback if DB is reachable but empty (seeding failure)
    if (!rows.length && slug === 'default') {
      return getFailSafeTenant();
    }

    return rows[0] || null;
  } catch (err) {
    if (slug === 'default') {
      logger.warn('🏢 Providing Fail-Safe "default" tenant record (Postgres CONNECTION_FAILURE)');
      return getFailSafeTenant();
    }
    logger.error(`Error fetching tenant by slug: ${slug}`, err);
    return null;
  }
}

/**
 * 🛡️ Relentless Resilience: Fallback data for critical system bootstrapping.
 */
function getFailSafeTenant(): PgTenant {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    slug: 'default',
    name: 'NEXUS (Fail-Safe Mode)',
    logoUrl: null,
    plan: 'pro',
    planExpiresAt: null,
    theme: { primary: '#0ea5e9', accent: '#ffffff' },
    config: { currencySymbol: '₹', taxEnabled: true, taxRate: 5 },
    suspended: false
  };
}

export async function getPgTenantById(id: string): Promise<PgTenant | null> {
  try {
    const sql = `SELECT * FROM tenants WHERE id = $1 LIMIT 1`;
    const rows = await query<PgTenant>('SYSTEM', sql, [id]);
    
    // 🛡️ Relentless Resilience: Fallback for 'default' tenant ID in development
    if (!rows.length && (id === 'default' || id === '00000000-0000-0000-0000-000000000000')) {
      return getFailSafeTenant();
    }

    return rows[0] || null;
  } catch (err) {
    if (id === 'default' || id === '00000000-0000-0000-0000-000000000000') {
      logger.warn('🏢 Providing Fail-Safe "default" tenant record by ID (Postgres CONNECTION_FAILURE)');
      return getFailSafeTenant();
    }
    logger.error(`Error fetching tenant by id: ${id}`, err);
    return null;
  }
}

/**
 * List all tenants (privileged - bypasses RLS)
 */
export async function listPgTenants(): Promise<PgTenant[]> {
  const sql = `SELECT * FROM tenants ORDER BY created_at DESC`;
  const rows = await query<PgTenant>('SYSTEM', sql);
  return rows;
}

/**
 * Update tenant metadata (privileged)
 */
export async function updatePgTenant(id: string, updates: Partial<PgTenant>): Promise<PgTenant | null> {
  const keys = Object.keys(updates);
  if (keys.length === 0) return null;

  const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
  const values = Object.values(updates);

  const sql = `UPDATE tenants SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
  const rows = await query<PgTenant>('SYSTEM', sql, [id, ...values]);
  return rows[0] || null;
}
