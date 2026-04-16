import { Injectable, NotFoundException } from '@nestjs/common';
import { query } from '@/lib/db/postgres';

@Injectable()
export class FlagsService {
  /**
   * Toggles a specific feature flag for a tenant.
   */
  async toggleFeature(tenantId: string, flag: string, enabled: boolean) {
    const res = await query<any>('SYSTEM', `
      UPDATE tenants 
      SET config = config || jsonb_build_object($1, $2::boolean),
          updated_at = NOW()
      WHERE id = $3
      RETURNING config
    `, [flag, enabled, tenantId]);

    if (!res.length) {
      throw new NotFoundException('Tenant not found');
    }

    return res[0].config;
  }

  /**
   * Get all flags for a tenant.
   */
  async getFlags(tenantId: string) {
    const res = await query<any>('SYSTEM', 'SELECT config FROM tenants WHERE id = $1', [tenantId]);
    if (!res.length) throw new NotFoundException('Tenant not found');
    return res[0].config;
  }
}
