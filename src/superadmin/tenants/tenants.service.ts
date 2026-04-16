import { Injectable, NotFoundException } from '@nestjs/common';
import { query } from '@/lib/db/postgres';

@Injectable()
export class TenantsService {
  /**
   * List all tenants in the platform (Global View).
   */
  async listAll() {
    return query<{ id: string, name: string, slug: string, plan: string, suspended: boolean }>(
      'SYSTEM', 
      'SELECT id, name, slug, plan, suspended, created_at FROM tenants ORDER BY created_at DESC'
    );
  }

  /**
   * Update tenant suspension status.
   */
  async updateSuspension(tenantId: string, suspended: boolean) {
    const res = await query('SYSTEM', 
      'UPDATE tenants SET suspended = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [suspended, tenantId]
    );

    if (!res.length) {
      throw new NotFoundException('Tenant not found');
    }

    return { success: true };
  }
}
