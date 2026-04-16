
import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, type AccessTokenPayload } from '../auth'
import { getPgTenantById } from '../db/postgres_tenants'
import { type PgTenant as DbTenant } from '../db/postgres_tenants'

// ── Extended request context ──────────────────────────────────────────────────
export interface AuthContext {
  user: AccessTokenPayload
  tenant: DbTenant
}

// Next.js 16 passes params as Promise<Record<string, string | string[]>>
type ParamsValue = string | string[]
type ParamsRecord = Record<string, ParamsValue>
type NextContext = { params?: Promise<ParamsRecord> | ParamsRecord }

type RouteHandler = (
  req: NextRequest,
  ctx: AuthContext,
  params?: ParamsRecord
) => Promise<NextResponse | Response>

// ── Extract token from request ────────────────────────────────────────────────
function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7)
  const cookie = req.cookies.get('access_token')
  if (cookie?.value) return cookie.value
  return null
}

// ── requireAuth HOF ──────────────────────────────────────────────────────────
export function requireAuth(
  handler: RouteHandler,
  allowedRoles?: Array<'admin' | 'cashier' | 'superadmin'>
) {
  return async function wrappedHandler(
    req: NextRequest,
    nextCtx: NextContext = {}
  ): Promise<NextResponse | Response> {
    // Resolve params (Next.js 16 may pass as Promise)
    let resolvedParams: ParamsRecord | undefined
    if (nextCtx.params) {
      resolvedParams = nextCtx.params instanceof Promise
        ? await nextCtx.params
        : nextCtx.params
    }

    // 1. Extract token
    const token = extractToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify JWT
    let claims: AccessTokenPayload
    try {
      claims = await verifyAccessToken(token)
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // 3. Role check
    if (allowedRoles && allowedRoles.length > 0) {
      const hasRole = claims.roles?.some((r: string) =>
        allowedRoles.includes(r as 'admin' | 'cashier' | 'superadmin')
      )
      if (!hasRole) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // 4. Load tenant from Postgres
    const tenant = await getPgTenantById(claims.tenantId)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found or account mismatch' }, { status: 404 })
    }

    // 5. Suspended check
    if (tenant.suspended) {
      return NextResponse.json({ error: 'Account suspended. Contact support.' }, { status: 403 })
    }

    return handler(req, { user: claims, tenant }, resolvedParams)
  }
}

// ── Convenience wrappers ──────────────────────────────────────────────────────
export function requireSuperAdmin(handler: RouteHandler) {
  return requireAuth(handler, ['superadmin'])
}

export function requireAdmin(handler: RouteHandler) {
  return requireAuth(handler, ['admin', 'superadmin'])
}

export function requireCashier(handler: RouteHandler) {
  return requireAuth(handler, ['admin', 'cashier', 'superadmin'])
}
