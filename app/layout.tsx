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
  const settings = await getSettingsCompat()
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="navbar">
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}
          >
            <span
              style={{
                fontSize: '1.55rem',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #f37c22, #e8521a)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.5px',
                userSelect: 'none',
              }}
            >{settings.restaurant.name}</span>
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
            <Link href="/messages" className="nav-link">
              Marketing
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
            opacity: 0.12,
            filter: 'blur(50px)',
            transform: 'scale(2)',
          }}
        >
          <img src="/logo.png" alt="" style={{ width: '60vmin', height: '60vmin', objectFit: 'contain' }} />
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
