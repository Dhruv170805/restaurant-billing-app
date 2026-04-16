import { query, transaction } from './postgres';
import { logger } from '../logger';

export interface PgCategory {
  id: number;
  tenant_id: string;
  name: string;
}

export interface PgMenuItem {
  id: number;
  tenant_id: string;
  category_id: number | null;
  name: string;
  price: string; // Postgres DECIMAL returns as string in 'pg'
  available: boolean;
}

/**
 * Fetch all categories for a specific tenant.
 * RLS automatically filters this by the currently set app.current_tenant_id.
 */
export async function listPgCategories(tenantId: string): Promise<PgCategory[]> {
  const sql = `SELECT * FROM categories ORDER BY name ASC`;
  return await query<PgCategory>(tenantId, sql);
}

/**
 * Fetch all menu items for a specific tenant.
 */
export async function listPgMenuItems(tenantId: string): Promise<PgMenuItem[]> {
  const sql = `SELECT * FROM menu_items ORDER BY name ASC`;
  return await query<PgMenuItem>(tenantId, sql);
}

/**
 * Create a new category for a tenant.
 */
export async function createPgCategory(tenantId: string, name: string): Promise<PgCategory> {
  const sql = `INSERT INTO categories (tenant_id, name) VALUES ($1, $2) RETURNING *`;
  const rows = await query<PgCategory>(tenantId, sql, [tenantId, name]);
  return rows[0];
}

/**
 * Create a new menu item for a tenant.
 */
export async function createPgMenuItem(data: {
  tenantId: string;
  categoryId: number | null;
  name: string;
  price: number;
}): Promise<PgMenuItem> {
  const sql = `
    INSERT INTO menu_items (tenant_id, category_id, name, price)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const rows = await query<PgMenuItem>(data.tenantId, sql, [
    data.tenantId,
    data.categoryId,
    data.name,
    data.price
  ]);
  return rows[0];
}

/**
 * Update a menu item's availability.
 */
export async function updatePgMenuItemAvailability(
  tenantId: string,
  itemId: number,
  available: boolean
): Promise<PgMenuItem | null> {
  const sql = `UPDATE menu_items SET available = $1 WHERE id = $2 RETURNING *`;
  const rows = await query<PgMenuItem>(tenantId, sql, [available, itemId]);
  return rows[0] || null;
}
