import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/middleware/auth'
import { getTenantBySlug, updateTenant, suspendTenant, reactivateTenant } from '@/lib/db/tenants'
import { signImpersonationToken } from '@/lib/auth'
import { logAuditEvent } from '@/lib/audit'
import { extractParam } from '@/lib/params'

// ── PATCH /api/admin/tenants/[slug] ──────────────────────────────────────────
export const PATCH = requireSuperAdmin(async (req, { user: actor }, params) => {
  const slug = extractParam(params?.slug)
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { action, plan, name, domain, suspended } = body

  if (action === 'suspend') {
    await suspendTenant(slug)
    await logAuditEvent({ type: 'TENANT_SUSPENDED', actorId: actor.sub!, actorEmail: actor.email, tenantId: 'superadmin', targetId: slug })
    return NextResponse.json({ success: true, action: 'suspended' })
  }

  if (action === 'reactivate') {
    await reactivateTenant(slug)
    await logAuditEvent({ type: 'TENANT_REACTIVATED', actorId: actor.sub!, actorEmail: actor.email, tenantId: 'superadmin', targetId: slug })
    return NextResponse.json({ success: true, action: 'reactivated' })
  }

  // General update (plan, name, domain)
  const updates: Record<string, unknown> = {}
  if (plan) updates.plan = plan
  if (name) updates.name = name
  if (domain !== undefined) updates.domain = domain
  if (suspended !== undefined) updates.suspended = suspended

  if (plan) {
    await logAuditEvent({
      type: 'PLAN_CHANGE',
      actorId: actor.sub!,
      actorEmail: actor.email,
      tenantId: 'superadmin',
      targetId: slug,
      payload: { newPlan: plan },
    })
  }

  const updated = await updateTenant(slug, updates)
  return NextResponse.json({ success: true, tenant: updated })
})

// ── POST /api/admin/tenants/[slug]/impersonate ─────────────────────────────
// Handled via dynamic route below, but also accessible here as action body
export const POST = requireSuperAdmin(async (req, { user: actor }, params) => {
  const slug = extractParam(params?.slug)
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const tenant = await getTenantBySlug(slug)
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const impersonationToken = await signImpersonationToken(actor.sub!, tenant.slug, actor.sub!)

  await logAuditEvent({
    type: 'IMPERSONATE',
    actorId: actor.sub!,
    actorEmail: actor.email,
    tenantId: 'superadmin',
    targetId: slug,
    payload: { targetTenant: slug },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ impersonationToken, expiresIn: '30m' })
})
