
import { type NextRequest } from 'next/server'
import { verifyAccessToken } from './auth'
import { getPgTenantBySlug, getPgTenantById } from './db/postgres_tenants'
import { type PgTenant as DbTenant } from './db/postgres_tenants'

/**
 * Resolve the current tenant from a request using the following priority:
 * 1. JWT access token tenantId claim (authenticated API calls — most reliable)
 * 2. X-Tenant-ID request header (mobile apps send this post-login)
 * 3. Host header subdomain decomposition (web SPA: acme.yourapp.com)
 * 4. Falls back to "default" tenant
 *
 * Result is Redis-cached per getTenantBySlug / getTenantByDomain.
 */
export async function resolveTenant(req: NextRequest): Promise<DbTenant | null> {
  // ── 1. JWT token ────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  const cookieToken = req.cookies.get('access_token')?.value
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken

  if (token) {
    try {
      const claims = await verifyAccessToken(token)
      if (claims.tenantId) {
        return getPgTenantById(claims.tenantId)
      }
    } catch {
      // Invalid token — fall through to header/subdomain
    }
  }

  // ── 2. X-Tenant-ID header ──────────────────────────────────────────────────
  const tenantHeader = req.headers.get('X-Tenant-ID')
  if (tenantHeader) {
    const tenant = await getPgTenantById(tenantHeader)
    if (tenant) return tenant
  }

  // ── 3. Subdomain from Host header ──────────────────────────────────────────
  const host = req.headers.get('host') || ''
  const appDomain = process.env.APP_DOMAIN || 'localhost'

  // Check custom domain first (e.g. billing.restaurant.com)
  if (host && !host.includes(appDomain) && !host.startsWith('localhost')) {
    // Note: Custom domain lookup in Postgres will be added to the schema in the next step
    // For now, we fall through to slug
  }

  // Extract subdomain (e.g. "acme" from "acme.yourapp.com")
  const parts = host.split('.')
  if (parts.length >= 3) {
    const subdomain = parts[0]
    if (subdomain && subdomain !== 'www' && subdomain !== 'admin') {
      const subdomainTenant = await getPgTenantBySlug(subdomain)
      if (subdomainTenant) return subdomainTenant
    }
  }

  // ── 4. Fall back to "default" tenant ───────────────────────────────────────
  return getPgTenantBySlug('default')
}
