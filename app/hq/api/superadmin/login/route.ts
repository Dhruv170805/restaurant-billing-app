import { NextResponse } from 'next/server';
import { getSuperAdminByEmail } from '@/lib/db/postgres_superadmin';
import { verifyPassword } from '@/lib/auth';
import { signSuperToken } from '@/lib/super_auth';

/**
 * SuperAdmin Control Plane Login API.
 * Secure entry point for platform owners at hq.nexuspos.local.
 */
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const admin = await getSuperAdminByEmail(email);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, admin.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 1. Check for 2FA requirement
    if (admin.totp_enabled) {
      // Return a partial session that requires 2FA verification
      const token = await signSuperToken({
        sub: admin.id,
        email: admin.email,
        role: admin.role,
        is2faVerified: false
      });

      const res = NextResponse.json({ status: 'PENDING_2FA' });
      res.cookies.set('super_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/hq'
      });
      return res;
    }

    // 2. Direct login (if 2FA disabled - not recommended)
    const token = await signSuperToken({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      is2faVerified: true
    });

    const res = NextResponse.json({ status: 'SUCCESS' });
    res.cookies.set('super_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/hq'
    });
    return res;

  } catch (err) {
    console.error('SuperAuth error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
