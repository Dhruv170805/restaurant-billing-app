import { Injectable, NotFoundException } from '@nestjs/common';
import { query } from '@/lib/db/postgres';
import { signImpersonationToken } from '@/lib/auth';

@Injectable()
export class ImpersonationService {
  /**
   * Generates a secure, short-lived impersonation token.
   */
  async startImpersonation(superAdminId: string, tenantId: string, targetEmail: string) {
    // 1. Fetch Target User
    const userRes = await query<{ id: string }>('SYSTEM', 
      'SELECT id FROM users WHERE tenant_id = $1 AND email = $2 LIMIT 1',
      [tenantId, targetEmail]
    );

    if (!userRes.length) {
      throw new NotFoundException('Target user not found in this tenant');
    }

    const targetUserId = userRes[0].id;

    // 2. Generate Impersonation Token (Short-lived 30m)
    const token = await signImpersonationToken(
      superAdminId,
      tenantId,
      targetUserId
    );

    return {
      token,
      targetUserId,
    };
  }
}
