import { Pool, PoolClient } from 'pg';
import { logger } from '../logger';

// ── SaaS PostgreSQL Connection Pool ───
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://nexus_admin:nexus_secret_change_me@localhost:5432/restaurant_saas',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle PostgreSQL client', err);
});

export async function query<T>(
  tenantId: string,
  text: string,
  params?: any[]
): Promise<T[]> {
  try {
    const client = await pool.connect();
    try {
      // 🛡️ Enforce Isolation at the DB Layer
      await client.query(`SET app.current_tenant_id = $1`, [tenantId]);
      
      const res = await client.query(text, params);
      return res.rows as T[];
    } finally {
      client.release();
    }
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED') {
      logger.warn(`🐘 PostgreSQL Unreachable (5432): Proceeding in Fail-Safe/Mock mode for query: ${text.slice(0, 50)}...`);
      return []; // Return empty result set instead of crashing
    }
    throw err;
  }
}

/**
 * Transaction wrapper with tenant isolation.
 */
export async function transaction<T>(
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET app.current_tenant_id = $1`, [tenantId]);
    
    try {
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  } finally {
    client.release();
  }
}

export default pool;
