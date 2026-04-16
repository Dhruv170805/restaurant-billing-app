import { NextResponse } from 'next/server';
import { getSuperAdminSession } from '@/lib/next_auth_utils';
import { signImpersonationToken } from '@/lib/auth';
import { query } from '@/lib/db/postgres';
import { logger } from '@/lib/logger';

/**
 * SuperAdmin Impersonation Engine.
 * Allows a platform owner to securely enter a tenant's environment for support.
 * Guaranteed zero-trust via 2FA verification and immutable audit logging.
 */
export async function POST(req: Request) {
  try {
    const session = await getSuperAdminSession();
    
    // 1. Mandatory 2FA Check
    if (!session || !session.is2faVerified) {
      return NextResponse.json({ error: '2FA verification required for impersonation' }, { status: 403 });
    }

    const { tenantId, targetEmail } = await req.json();

    // 2. Fetch Target User
    const userRes = await query<{ id: string }>('SYSTEM', 
      'SELECT id FROM users WHERE tenant_id = $1 AND email = $2 LIMIT 1',
      [tenantId, targetEmail]
    );

    if (!userRes.length) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const targetUserId = userRes[0].id;

    // 3. Generate Impersonation Token (Short-lived 30m)
    const impersonationToken = await signImpersonationToken(
      session.sub as string,
      tenantId,
      targetUserId
    );

    // 4. Immutable Audit Log
    await query('SYSTEM', 
      'INSERT INTO platform_audit_logs (actor_id, type, tenant_id, payload) VALUES ($1, $2, $3, $4)',
      [session.sub, 'IMPERSONATE', tenantId, JSON.stringify({ targetEmail })]
    );

    logger.info(`SuperAdmin ${session.email} impersonated user ${targetEmail} for tenant ${tenantId}`);

    // 5. Response with the token
    const res = NextResponse.json({ status: 'SUCCESS' });
    
    // Set the standard access_token cookie for the tenant domain
    res.cookies.set('access_token', impersonationToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return res;

  } catch (err) {
    console.error('Impersonation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
