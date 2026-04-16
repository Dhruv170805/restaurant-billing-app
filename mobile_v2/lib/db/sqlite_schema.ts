import * as SQLite from 'expo-sqlite';

/**
 * High-fidelity SQLite database initialization for the React Native POS.
 * This mirrors our PostgreSQL relational schema to ensure seamless offline-first synchronization.
 */
export async function initDatabase() {
  const db = await SQLite.openDatabaseAsync('nexus_pos_v2.db');

  // 1. Tenants metadata cache
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tenant_config (
      id TEXT PRIMARY KEY,
      name TEXT,
      theme_primary TEXT,
      currency_symbol TEXT,
      last_synced_at TEXT
    );
  `);

  // 2. Menu Categories
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  // 3. Menu Items
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY,
      category_id INTEGER,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      available INTEGER DEFAULT 1,
      deleted_at TEXT
    );
  `);

  // 4. Orders (Local Buffer)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS orders (
      local_id TEXT PRIMARY KEY, -- UUID for local tracking
      remote_id INTEGER,         -- From Postgres after sync
      table_number INTEGER,
      status TEXT DEFAULT 'PENDING',
      total REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced_at TEXT
    );
  `);

  // 5. Order Items
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_order_id TEXT,
      menu_item_id INTEGER,
      name TEXT,
      price REAL,
      quantity INTEGER,
      FOREIGN KEY(local_order_id) REFERENCES orders(local_id)
    );
  `);

  return db;
}
