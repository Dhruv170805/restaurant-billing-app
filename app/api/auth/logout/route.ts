import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, hashToken } from '@/lib/auth'
import { revokeUserRefreshToken } from '@/lib/db/users'
import { logAuditEvent } from '@/lib/audit'
import { verifyAccessToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refresh_token')?.value
  const accessToken = req.cookies.get('access_token')?.value

  let userId = 'unknown'
  let tenantId = 'unknown'
  let email = 'unknown'

  if (accessToken) {
    try {
      const claims = await verifyAccessToken(accessToken)
      userId = claims.sub!
      tenantId = claims.tenantId
      email = claims.email
    } catch { /* expired token is fine for logout */ }
  }

  if (refreshToken) {
    try {
      const payload = await verifyRefreshToken(refreshToken) as { sub: string }
      const hash = await hashToken(refreshToken)
      await revokeUserRefreshToken(payload.sub, hash)
    } catch { /* already invalid */ }
  }

  await logAuditEvent({ type: 'LOGOUT', actorId: userId, actorEmail: email, tenantId })

  const res = NextResponse.json({ success: true })
  res.cookies.delete('access_token')
  res.cookies.delete('refresh_token')
  return res
}
