import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin } from '@/lib/middleware/auth'
import { resolveTenant } from '@/lib/tenant'
import { updateTenant, invalidateTenantCache } from '@/lib/db/tenants'
import { getCache, setCache } from '@/lib/redis'

const PUBLIC_CACHE_TTL = 300 // 5 min

// ── GET /api/tenant — public, no auth required ────────────────────────────────
export async function GET(req: NextRequest) {
  const tenant = await resolveTenant(req)
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const cacheKey = `tenant:public:${tenant.slug}`
  const cached = await getCache(cacheKey).catch(() => null)
  if (cached) return NextResponse.json(cached)

  const payload = {
    slug: tenant.slug,
    name: tenant.name,
    logoUrl: tenant.logoUrl ?? null,
    theme: tenant.theme,
    plan: tenant.plan,
    config: {
      currencySymbol: tenant.config.currencySymbol,
      currencyCode: tenant.config.currencyCode,
      currencyLocale: tenant.config.currencyLocale,
      taxEnabled: tenant.config.taxEnabled,
      taxRate: tenant.config.taxRate,
      taxLabel: tenant.config.taxLabel,
      maxTables: tenant.config.maxTables,
      address: tenant.config.address || '',
      phone: tenant.config.phone || '',
      tagline: tenant.config.tagline || '',
    },
    features: {
      analytics: tenant.plan === 'starter' || tenant.plan === 'pro',
      gstInvoice: tenant.plan === 'pro',
      kds: tenant.plan !== 'free',
      marketing: tenant.plan !== 'free',
      multiUser: tenant.plan === 'pro',
    },
  }

  await setCache(cacheKey, payload, PUBLIC_CACHE_TTL).catch(() => {})
  return NextResponse.json(payload)
}

// ── PATCH /api/tenant — admin only ────────────────────────────────────────────
export const PATCH = requireAdmin(async (req, { tenant }) => {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowed = ['name', 'theme', 'config', 'domain']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const updated = await updateTenant(tenant.slug, updates)
  await invalidateTenantCache(tenant.slug)

  return NextResponse.json({ success: true, tenant: updated })
})
