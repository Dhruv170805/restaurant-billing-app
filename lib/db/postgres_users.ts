import { query, transaction } from './postgres';
import { logger } from '../logger';
import { v4 as uuidv4 } from 'uuid';

export interface PgUser {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  name: string;
  roles: string[];
  created_at?: string;
}

/**
 * Atomic creation of a new tenant and its initial admin user.
 * This is the ultimate "Zero-Trust" onboarding pattern.
 */
export async function provisionTenantAdmin(data: {
  slug: string;
  restaurantName: string;
  ownerName: string;
  email: string;
  passwordHash: string;
}): Promise<{ tenantId: string; userId: string }> {
  return await transaction('SYSTEM', async (client) => {
    // 1. Create Tenant
    const tenantId = uuidv4();
    const tenantSql = `
      INSERT INTO tenants (id, slug, name)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const tenantRes = await client.query(tenantSql, [tenantId, data.slug, data.restaurantName]);
    const actualTenantId = tenantRes.rows[0].id;

    // 2. Create Admin User
    const userId = uuidv4();
    const userSql = `
      INSERT INTO users (id, tenant_id, email, password_hash, name, roles, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    const userRes = await client.query(userSql, [
      userId,
      actualTenantId,
      data.email,
      data.passwordHash,
      data.ownerName,
      ['admin'],
      false
    ]);

    return { 
      tenantId: actualTenantId, 
      userId: userRes.rows[0].id 
    };
  });
}

/**
 * Fetch a user by email within a specific tenant context.
 * Enforced by RLS if called via the 'query' helper.
 */
export async function getPgUserByEmail(tenantId: string, email: string): Promise<PgUser | null> {
  const sql = `SELECT * FROM users WHERE email = $1 LIMIT 1`;
  const rows = await query<PgUser>(tenantId, sql, [email]);
  return rows[0] || null;
}
