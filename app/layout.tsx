import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './theme.css'
import Link from 'next/link'
import { Toaster } from 'sonner'
import { getSettingsCompat } from '@/lib/settings'

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
  const settings = await getSettingsCompat()
  return {
    title: settings.restaurant.name,
    description: `${settings.restaurant.name} — Restaurant Billing & POS System`,
    manifest: '/manifest.json',
    icons: {
      apple: '/icon-192x192.png',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: settings.restaurant.name,
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          if (!sessionStorage.getItem('force_reload_theme_v3')) {
            sessionStorage.setItem('force_reload_theme_v3', 'true');
            window.location.reload(true);
          }
        `,
          }}
        />
        <nav className="navbar">
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}
          >
            <svg
              width="72"
              height="72"
              viewBox="0 0 120 120"
              xmlns="http://www.w3.org/2000/svg"
              style={{ flexShrink: 0 }}
            >
              {/* Shree Logo part */}
              <text
                x="10"
                y="68"
                fontFamily="Arial, sans-serif"
                fontSize="52"
                fontWeight="900"
                fill="#f37c22"
                style={{ filter: 'drop-shadow(1px 1px 0px rgba(0,0,0,0.1))' }}
              >
                श्री
              </text>

              {/* ji Logo part */}
              <text
                x="66"
                y="72"
                fontFamily="Arial, sans-serif"
                fontSize="58"
                fontWeight="900"
                fill="#e61c24"
                style={{ filter: 'drop-shadow(1px 1px 0px rgba(0,0,0,0.1))' }}
              >
                ji
              </text>

              {/* Subtext */}
              <text
                x="60"
                y="102"
                fontFamily="Georgia, serif"
                fontSize="18"
                fontWeight="bold"
                fontStyle="italic"
                fill="#aa0000"
                textAnchor="middle"
              >
                Restaurant
              </text>
            </svg>
          </Link>
          <div className="flex gap-6">
            <Link href="/" className="nav-link">
              Tables
            </Link>
            <Link href="/menu" className="nav-link">
              Menu
            </Link>
            <Link href="/orders" className="nav-link">
              Orders
            </Link>
            <Link href="/dashboard" className="nav-link">
              Sales
            </Link>
            <Link href="/settings" className="nav-link">
              ⚙️
            </Link>
          </div>
        </nav>

        {/* Blurred Background Logo */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: -1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            opacity: 0.25,
            filter: 'blur(45px)',
            transform: 'scale(1.5)',
          }}
        >
          <svg
            width="80vmin"
            height="80vmin"
            viewBox="0 0 120 120"
            xmlns="http://www.w3.org/2000/svg"
          >
            <text
              x="10"
              y="68"
              fontFamily="Arial, sans-serif"
              fontSize="52"
              fontWeight="900"
              fill="#f37c22"
            >
              श्री
            </text>
            <text
              x="66"
              y="72"
              fontFamily="Arial, sans-serif"
              fontSize="58"
              fontWeight="900"
              fill="#e61c24"
            >
              ji
            </text>
          </svg>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <main className="container animate-fade-in">{children}</main>
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
      </body>
    </html>
  )
}
