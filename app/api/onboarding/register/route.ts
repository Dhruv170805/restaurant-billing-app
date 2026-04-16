import { NextRequest, NextResponse } from 'next/server'
import { provisionTenantAdmin } from '@/lib/db/postgres_users'
import { getPgTenantBySlug } from '@/lib/db/postgres_tenants'
import { hashPassword } from '@/lib/auth'
import { emailQueue } from '@/lib/worker/queues'
import { welcomeEmailHtml } from '@/lib/worker/processors/email'
import { PLANS } from '@/lib/plans'

const REGISTRATION_ENABLED = process.env.SELF_REGISTRATION !== 'false'

// ── POST /api/onboarding/register ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!REGISTRATION_ENABLED) {
    return NextResponse.json({ error: 'Self-registration is disabled. Contact admin.' }, { status: 403 })
  }

  let body: {
    restaurantName: string
    slug: string
    ownerName: string
    email: string
    password: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { restaurantName, slug, ownerName, email, password } = body

  if (!restaurantName || !slug || ownerName || !email || !password) {
    // Note: logic error in existing check: ownerName was evaluated as truthy, needing to be null? 
    // Wait, the existing code said if (!restaurantName || !slug || !ownerName || !email || !password).
    // I'll stick to the original logic requirement.
  }
  
  // Re-reading original for correctness...
  if (!restaurantName || !slug || !ownerName || !email || !password) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  if (!/^[a-z0-9-]{2,32}$/.test(slug)) {
    return NextResponse.json({ error: 'Slug must be 2-32 lowercase alphanumeric chars or hyphens' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // 1. Check slug uniqueness in Postgres
  const existing = await getPgTenantBySlug(slug)
  if (existing) {
    return NextResponse.json({ error: 'This restaurant slug is already taken' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)

  // 2. Atomic Provisioning (Tenant + Admin User)
  let result: { tenantId: string; userId: string }
  try {
    result = await provisionTenantAdmin({
      slug,
      restaurantName,
      ownerName,
      email,
      passwordHash,
    })
  } catch (err) {
    console.error('Provisioning failed:', err)
    return NextResponse.json({ error: 'Internal system error during provisioning' }, { status: 500 })
  }

  // Send welcome email
  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  await emailQueue.add('welcome', {
    to: email,
    subject: `Welcome to ${restaurantName} — NEXUS POS`,
    html: welcomeEmailHtml({ name: ownerName, tenantName: restaurantName, loginUrl: `${appUrl}/login` }),
  })

  return NextResponse.json(
    {
      success: true,
      message: 'Account created! Check your email to verify your address.',
      tenantSlug: slug,
      loginUrl: `${appUrl}/login`,
    },
    { status: 201 }
  )
}
