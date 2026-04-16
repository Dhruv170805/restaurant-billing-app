import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/middleware/auth'
import { listPgTenants } from '@/lib/db/postgres_tenants'
import { provisionTenantAdmin } from '@/lib/db/postgres_users'
import { hashPassword } from '@/lib/auth'
import { logAuditEvent } from '@/lib/audit'
import { PLANS } from '@/lib/plans'

// ── GET /api/admin/tenants — list all tenants ─────────────────────────────────
export const GET = requireSuperAdmin(async (req, { user }) => {
  const tenants = await listPgTenants()
  return NextResponse.json({ tenants })
})

// ── POST /api/admin/tenants — create tenant + first admin user ────────────────
export const POST = requireSuperAdmin(async (req, { user: actor }) => {
  let body: {
    slug: string
    name: string
    adminEmail: string
    adminPassword: string
    adminName: string
    plan?: 'free' | 'starter' | 'pro'
    domain?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { slug, name, adminEmail, adminPassword, adminName, plan = 'free' } = body

  if (!slug || !name || !adminEmail || !adminPassword || !adminName) {
    return NextResponse.json({ error: 'slug, name, adminEmail, adminPassword, adminName are required' }, { status: 400 })
  }

  const passwordHash = await hashPassword(adminPassword)

  // Atomic Provisioning (Tenant + Admin User)
  const result = await provisionTenantAdmin({
    slug,
    restaurantName: name,
    ownerName: adminName,
    email: adminEmail,
    passwordHash,
  })

  await logAuditEvent({
    type: 'TENANT_CREATED',
    actorId: actor.sub!,
    actorEmail: actor.email,
    tenantId: 'superadmin',
    targetId: slug,
    payload: { slug, name, plan, adminEmail },
  })

  return NextResponse.json({ success: true, tenantId: result.tenantId, userId: result.userId }, { status: 201 })
})
