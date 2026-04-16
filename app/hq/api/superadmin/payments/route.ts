import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getSuperAdminSession } from '@/lib/next_auth_utils';

/**
 * SuperAdmin Payment Verification Engine.
 * Handles the manual approval/rejection of UPI payment requests.
 * Atomic update of tenant subscription status upon verification.
 */
export async function POST(req: Request) {
  try {
    const session = await getSuperAdminSession();
    if (!session || session.role !== 'OWNER' && session.role !== 'FINANCE') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { requestId, status, notes } = await req.json(); // status: 'APPROVED' | 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // -- 1. Process Approval Logic within a Transaction --
    await query('SYSTEM', 'BEGIN');

    try {
      // Fetch request details
      const reqRes = await query<{ status: string; tenant_id: string; plan_id: string; transaction_id: string }>('SYSTEM', 
        'SELECT * FROM payment_requests WHERE id = $1 FOR UPDATE',
        [requestId]
      );

      if (!reqRes.length || reqRes[0].status !== 'PENDING') {
        throw new Error('Invalid or already processed request');
      }

      const payment = reqRes[0];

      // Update request status
      await query('SYSTEM', 
        'UPDATE payment_requests SET status = $1, notes = $2, verified_by = $3, updated_at = NOW() WHERE id = $4',
        [status, notes, session.sub, requestId]
      );

      if (status === 'APPROVED') {
        // Upsert Subscription logic
        // We set the expiry to 30 days from now (or extend current period)
        await query('SYSTEM', `
          INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
          VALUES ($1, $2, 'ACTIVE', NOW(), NOW() + INTERVAL '30 days')
          ON CONFLICT (tenant_id) DO UPDATE SET
            plan_id = EXCLUDED.plan_id,
            status = 'ACTIVE',
            current_period_end = GREATEST(subscriptions.current_period_end, NOW()) + INTERVAL '30 days',
            updated_at = NOW()
        `, [payment.tenant_id, payment.plan_id]);

        // Success Audit
        await query('SYSTEM', 
          "INSERT INTO platform_audit_logs (actor_id, type, tenant_id, payload) VALUES ($1, 'SUBSCRIPTION_APPROVED', $2, $3)",
          [session.sub, payment.tenant_id, JSON.stringify({ planId: payment.plan_id, transactionId: payment.transaction_id })]
        );
      }

      await query('SYSTEM', 'COMMIT');
      return NextResponse.json({ status: 'SUCCESS' });

    } catch (e: any) {
      await query('SYSTEM', 'ROLLBACK');
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

  } catch (err) {
    console.error('Payment verification error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * List pending payment requests for the SuperAdmin queue.
 */
export async function GET() {
  const session = await getSuperAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await query('SYSTEM', `
    SELECT pr.*, t.name as tenant_name 
    FROM payment_requests pr
    JOIN tenants t ON pr.tenant_id = t.id
    WHERE pr.status = 'PENDING'
    ORDER BY pr.created_at ASC
  `);

  return NextResponse.json(rows);
}
