import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './theme.css'
import Link from 'next/link'
import { Toaster } from 'sonner'
import { headers } from 'next/headers'
import { getTenantBySlug } from '@/lib/db/tenants'
import { SWRProvider } from '@/components/ui/SWRProvider'

export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#d97706',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const tenantSlug = headersList.get('X-Tenant-ID') || 'default'
  const tenant = await getTenantBySlug(tenantSlug)

  const title = tenant?.name || 'NEXUS POS'
  return {
    title,
    description: `${title} — Multi-Tenant Restaurant POS System`,
    manifest: '/manifest.json',
    icons: { apple: '/icon-192x192.png' },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title,
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const tenantSlug = headersList.get('X-Tenant-ID') || 'default'
  const tenant = await getTenantBySlug(tenantSlug)

  const theme = 'system'
  const restaurantName = tenant?.name || 'NEXUS POS'
  const primaryColor = tenant?.theme?.primary || '#f37c22'
  const brandLogo = tenant?.logoUrl || '/logo.png'

  return (
    <html lang="en" data-theme={theme === 'system' ? undefined : theme} suppressHydrationWarning>
      <head>
        {/* Prefetch critical API routes so first-page data loads instantly */}
        <link rel="prefetch" href="/api/settings" as="fetch" crossOrigin="anonymous" />
        <link rel="prefetch" href="/api/tables" as="fetch" crossOrigin="anonymous" />
        {theme === 'system' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){var t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);})();`,
            }}
          />
        )}
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --primary: ${primaryColor};
              --primary-light: ${primaryColor}cc;
              --primary-dark: ${primaryColor};
            }
          `
        }} />
      </head>
      <body className={inter.className}>
        <SWRProvider>
          <nav className="navbar">
            <Link
              href="/"
              style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', padding: '0.2rem 0.5rem', borderRadius: '12px', transition: 'all 0.2s', background: 'rgba(255,255,255,0.03)' }}
              className="hover:scale-105"
            >
              {tenant?.logoUrl && (
                <img src={tenant.logoUrl} alt="Logo" style={{ height: '36px', width: '36px', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }} />
              )}
              <span
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.5px',
                  userSelect: 'none',
                }}
              >
                {restaurantName}
              </span>
            </Link>
            <div className="flex gap-6 items-center">
              <Link href="/" className="nav-link">Tables</Link>
              <Link href="/tables/qr" className="nav-link">QR</Link>
              <Link href="/menu" className="nav-link">Menu</Link>
              <Link href="/orders" className="nav-link">Orders</Link>
              <Link href="/dashboard" className="nav-link">Sales</Link>
              <Link href="/messages" className="nav-link">Marketing</Link>
              <Link href="/settings" className="nav-link" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '0.4rem 0.8rem' }}>Settings</Link>
            </div>
          </nav>

          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: -1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              opacity: 0.12,
              filter: 'blur(50px)',
              transform: 'scale(2)',
            }}
          >
            <img src={brandLogo} alt="" style={{ width: '60vmin', height: '60vmin', objectFit: 'contain', filter: 'saturate(2)' }} />
          </div>

          <div style={{ position: 'relative', zIndex: 1, paddingTop: '4.8rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <main className="container animate-fade-in" style={{ flex: 1, width: '100%' }}>{children}</main>
            <footer style={{ textAlign: 'center', padding: '1.5rem', opacity: 0.6, fontSize: '0.875rem' }}>
              Made By Dhruv Patel
            </footer>
          </div>

          <Toaster
            position="top-center"
            duration={2000}
            visibleToasts={1}
            toastOptions={{
              style: {
                background: 'rgba(20, 20, 40, 0.85)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#f0f0f8',
                borderRadius: '12px',
              },
            }}
          />
        </SWRProvider>
      </body>
    </html>
  )
}
