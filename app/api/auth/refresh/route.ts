import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, signAccessToken, hashToken, verifyTokenHash } from '@/lib/auth'
import { getUserById, updateUserRefreshToken } from '@/lib/db/users'
import { getTenantBySlug } from '@/lib/db/tenants'
import { ObjectId } from 'mongodb'

export async function POST(req: NextRequest) {
  const refreshToken =
    req.cookies.get('refresh_token')?.value ??
    (await req.json().catch(() => ({}))).refreshToken

  if (!refreshToken) {
    return NextResponse.json({ error: 'Refresh token required' }, { status: 401 })
  }

  let payload: { sub: string; tenantId: string }
  try {
    payload = await verifyRefreshToken(refreshToken) as { sub: string; tenantId: string }
  } catch {
    return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 })
  }

  const user = await getUserById(payload.sub)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 })

  // Verify hash match (token rotation security)
  const incomingHash = await hashToken(refreshToken)
  const tokenEntry = await Promise.any(
    user.refreshTokens.map(async (t) => {
      const match = await verifyTokenHash(refreshToken, t.hash)
      if (!match) throw new Error('no match')
      return t
    })
  ).catch(() => null)

  if (!tokenEntry) {
    return NextResponse.json({ error: 'Refresh token revoked or not recognised' }, { status: 401 })
  }

  if (new Date(tokenEntry.expiresAt) < new Date()) {
    return NextResponse.json({ error: 'Refresh token expired' }, { status: 401 })
  }

  const tenant = await getTenantBySlug(payload.tenantId)
  if (!tenant || tenant.suspended) {
    return NextResponse.json({ error: 'Tenant unavailable' }, { status: 403 })
  }

  const newAccessToken = await signAccessToken({
    sub: user._id,
    tenantId: tenant.slug,
    roles: user.roles,
    email: user.email,
    name: user.name,
  })

  const res = NextResponse.json({ accessToken: newAccessToken })
  res.cookies.set('access_token', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60,
    path: '/',
  })

  return res
}
