import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { getDb } from '@/lib/db/mongo'
import { getPlanFeatures, PLANS } from '@/lib/plans'
import { emailQueue } from '@/lib/worker/queues'
import type { PlanId } from '@/lib/plans'

// ── GET /api/billing — current plan + usage ───────────────────────────────────
export const GET = requireAuth(async (req, { user, tenant }) => {
  const db = await getDb()

  const [tableCount, menuItemCount, ordersThisMonth] = await Promise.all([
    // Proxy: check max tables via settings
    db.collection('settings').findOne({ tenantId: tenant.slug }).then(s => s?.tableCount ?? 0),
    db.collection('menu_items').countDocuments({ tenantId: tenant.slug }),
    db.collection('orders').countDocuments({
      tenantId: tenant.slug,
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString() },
    }),
  ])

  const plan = tenant.plan as PlanId
  const features = getPlanFeatures(plan)
  const planInfo = PLANS[plan]

  return NextResponse.json({
    currentPlan: plan,
    planName: planInfo.name,
    features,
    usage: {
      tables: { current: tableCount, max: features.maxTables },
      menuItems: { current: menuItemCount, max: features.maxMenuItems },
      ordersThisMonth,
    },
    planExpiresAt: tenant.planExpiresAt ?? null,
    allPlans: Object.entries(PLANS).map(([id, p]) => ({ id, name: p.name, features: p.features })),
  })
})

// ── POST /api/billing/upgrade — request upgrade (sends email to superadmin) ───
export const POST = requireAuth(async (req, { user, tenant }) => {
  const body = await req.json().catch(() => ({}))
  const { requestedPlan = 'pro' } = body

  if (!['starter', 'pro'].includes(requestedPlan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const superadminEmail = process.env.SUPERADMIN_EMAIL
  if (superadminEmail) {
    await emailQueue.add('upgrade-request', {
      to: superadminEmail,
      subject: `[NEXUS POS] Plan Upgrade Request — ${tenant.name}`,
      html: `
        <h2>Plan Upgrade Request</h2>
        <p><strong>Tenant:</strong> ${tenant.name} (${tenant.slug})</p>
        <p><strong>Requested by:</strong> ${user.email}</p>
        <p><strong>Current plan:</strong> ${tenant.plan}</p>
        <p><strong>Requested plan:</strong> ${requestedPlan}</p>
        <p>Log in to the admin panel to confirm the upgrade.</p>
      `,
    })
  }

  return NextResponse.json({
    success: true,
    message: 'Upgrade request submitted. Our team will process it within 24 hours.',
    requestedPlan,
  })
})
