import { Injectable, BadRequestException } from '@nestjs/common';
import { query } from '@/lib/db/postgres';

@Injectable()
export class BillingService {
  /**
   * Verified a manual payment and updates the tenant subscription lifecycle.
   */
  async verifyPayment(requestId: string, status: 'APPROVED' | 'REJECTED', superAdminId: string, notes?: string) {
    await query('SYSTEM', 'BEGIN');

    try {
      // 1. Fetch Request
      const reqRes = await query<{ status: string, tenant_id: string, plan_id: string, transaction_id: string }>('SYSTEM', 
        'SELECT * FROM payment_requests WHERE id = $1 FOR UPDATE',
        [requestId]
      );

      if (!reqRes.length || reqRes[0].status !== 'PENDING') {
        throw new BadRequestException('Invalid or already processed request');
      }

      const payment = reqRes[0];

      // 2. Update Request Status
      await query('SYSTEM', 
        'UPDATE payment_requests SET status = $1, notes = $2, verified_by = $3, updated_at = NOW() WHERE id = $4',
        [status, notes, superAdminId, requestId]
      );

      if (status === 'APPROVED') {
        // 3. Upsert Subscription (extend 30 days)
        await query('SYSTEM', `
          INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
          VALUES ($1, $2, 'ACTIVE', NOW(), NOW() + INTERVAL '30 days')
          ON CONFLICT (tenant_id) DO UPDATE SET
            plan_id = EXCLUDED.plan_id,
            status = 'ACTIVE',
            current_period_end = GREATEST(subscriptions.current_period_end, NOW()) + INTERVAL '30 days',
            updated_at = NOW()
        `, [payment.tenant_id, payment.plan_id]);
      }

      await query('SYSTEM', 'COMMIT');
      return { success: true };

    } catch (e) {
      await query('SYSTEM', 'ROLLBACK');
      throw e;
    }
  }

  /**
   * List pending manual payments.
   */
  async getPendingPayments() {
    return query('SYSTEM', `
      SELECT pr.*, t.name as tenant_name 
      FROM payment_requests pr
      JOIN tenants t ON pr.tenant_id = t.id
      WHERE pr.status = 'PENDING'
      ORDER BY pr.created_at ASC
    `);
  }
}
