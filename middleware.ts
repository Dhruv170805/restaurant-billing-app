import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't need authentication
const PUBLIC_PATHS = new Set([
  '/login',
  '/hq/login',
  '/setup',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/tenant',
  '/api/health',
  '/api/metrics',
])

// Path prefixes that are public
const PUBLIC_PREFIXES = [
  '/onboarding',
  '/api/onboarding',
  '/api/auth/',
  '/_next/',
  '/favicon',
  '/icon',
  '/logo',
  '/manifest',
  '/bill/',
]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true
  // Static files
  if (pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?|css|js|map)$/)) return true
  return false
}

function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: *",
      "connect-src 'self' wss: ws:",
    ].join('; ')
  )
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
  return res
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const host = req.headers.get('host') || ''

  // ── 1. Plane Detection ──────────────────────────────────────────────────
  // Check if we are on the HQ Control Plane (hq.nexuspos.local)
  const isHqPlane = host.startsWith('hq.') || host === 'hq.localhost'

  // Always add security headers
  const res = NextResponse.next()
  addSecurityHeaders(res)

  // ── 2. HQ Control Plane Logic ───────────────────────────────────────────
  if (isHqPlane) {
    // Public paths for HQ (Login/Metrics)
    if (pathname === '/hq/login' || pathname.startsWith('/hq/api/superadmin/login')) {
      return res
    }

    const superToken = req.cookies.get('super_token')?.value
    if (!superToken) {
      if (pathname.startsWith('/hq/api/')) {
        return NextResponse.json({ error: 'Unauthorized HQ Access' }, { status: 401 })
      }
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/hq/login'
      return NextResponse.redirect(loginUrl)
    }
    return res
  }

  // ── 3. Tenant Plane Logic (Standard POS/Admin) ───────────────────────────
  // Skip auth for public paths
  if (isPublicPath(pathname)) return res

  // Check for access token (cookie or Authorization header)
  const accessToken =
    req.cookies.get('access_token')?.value ??
    req.headers.get('Authorization')?.replace('Bearer ', '')

  if (!accessToken) {
    // API routes → 401 JSON
    if (pathname.startsWith('/api/')) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      )
    }
    // Page routes → redirect to login
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
