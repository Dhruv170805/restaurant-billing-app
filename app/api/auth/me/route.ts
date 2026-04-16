import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { getUserById } from '@/lib/db/users'

export const GET = requireAuth(async (req, { user, tenant }) => {
  const fullUser = await getUserById(user.sub!)
  if (!fullUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({
    id: fullUser._id,
    email: fullUser.email,
    name: fullUser.name,
    roles: fullUser.roles,
    totpEnabled: fullUser.totpEnabled,
    emailVerified: fullUser.emailVerified,
    tenantId: fullUser.tenantId,
    tenant: {
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      theme: tenant.theme,
      logoUrl: tenant.logoUrl,
    },
  })
})
