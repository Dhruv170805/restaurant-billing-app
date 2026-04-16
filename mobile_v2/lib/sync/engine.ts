import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { initDatabase } from '../db/sqlite_schema';

const API_BASE = 'https://api.your-nexus-pos.com'; // Injected via env

/**
 * The "God-Level" Sync Engine.
 * Responsible for bi-directional state synchronization between the React Native fleet
 * and the PostgreSQL relational core. Maintains POS resilience during network outages.
 */
export class SyncEngine {
  private db: any;

  constructor() {
    this.init();
  }

  private async init() {
    this.db = await initDatabase();
  }

  /**
   * PULL: Sync down Menu and Categories from the server.
   * Leverages a delta-sync pattern (future optimization: last_synced_at).
   */
  async pullMenu() {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const response = await axios.get(`${API_BASE}/api/menu`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const items = response.data;
      
      // Atomic Update in SQLite
      await this.db.withTransactionAsync(async () => {
        // Clear old cache (or perform upsert)
        await this.db.runAsync('DELETE FROM menu_items');
        
        for (const item of items) {
          await this.db.runAsync(
            'INSERT INTO menu_items (id, category_id, name, price, available) VALUES (?, ?, ?, ?, ?)',
            [item.id, item.category_id, item.name, item.price, item.available ? 1 : 0]
          );
        }
      });

      console.log(`📦 Pulled ${items.length} menu items from cloud`);
    } catch (err) {
      console.error('❌ Sync PULL failed:', err);
    }
  }

  /**
   * PUSH: Upload local orders to the PostgreSQL core.
   */
  async pushOrders() {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      
      // Get unsynced orders
      const unsynced = await this.db.getAllAsync(
        'SELECT * FROM orders WHERE synced_at IS NULL'
      );

      for (const order of unsynced) {
        // Fetch items for this order
        const items = await this.db.getAllAsync(
          'SELECT menu_item_id as id, quantity FROM order_items WHERE local_order_id = ?',
          [order.local_id]
        );

        // Upload to Postgres
        const res = await axios.post(`${API_BASE}/api/orders`, {
          items,
          tableNumber: order.table_number,
          customerName: order.customer_name,
          customerPhone: order.customer_phone
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Mark as synced locally
        if (res.status === 201) {
          await this.db.runAsync(
            'UPDATE orders SET remote_id = ?, synced_at = CURRENT_TIMESTAMP WHERE local_id = ?',
            [res.data.id, order.local_id]
          );
        }
      }
      
      console.log(`🚀 Pushed ${unsynced.length} local orders to cloud`);
    } catch (err) {
      console.error('❌ Sync PUSH failed:', err);
    }
  }
}

export const syncEngine = new SyncEngine();
