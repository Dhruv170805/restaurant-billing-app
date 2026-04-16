import { query } from './postgres';
import { logger } from '../logger';

export interface PgSuperAdmin {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: 'OWNER' | 'FINANCE' | 'SUPPORT';
  totp_secret: string | null;
  totp_enabled: boolean;
}

/**
 * Fetch a SuperAdmin by email (HQ Control Plane only)
 */
export async function getSuperAdminByEmail(email: string): Promise<PgSuperAdmin | null> {
  try {
    const sql = `SELECT * FROM super_admins WHERE email = $1 LIMIT 1`;
    const rows = await query<PgSuperAdmin>('SYSTEM', sql, [email]);
    return rows[0] || null;
  } catch (err) {
    logger.error(`Error fetching super_admin by email: ${email}`, err);
    return null;
  }
}

/**
 * Update SuperAdmin metadata (e.g., 2FA setup)
 */
export async function updateSuperAdmin(id: string, updates: Partial<PgSuperAdmin>): Promise<PgSuperAdmin | null> {
  const keys = Object.keys(updates);
  if (keys.length === 0) return null;

  const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
  const values = Object.values(updates);

  const sql = `UPDATE super_admins SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
  const rows = await query<PgSuperAdmin>('SYSTEM', sql, [id, ...values]);
  return rows[0] || null;
}
