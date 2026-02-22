import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { Toaster } from 'sonner'
import { getSettingsCompat } from '@/lib/settings'

const inter = Inter({ subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettingsCompat()
  return {
    title: settings.restaurant.name,
    description: `${settings.restaurant.name} — Restaurant Billing & POS System`,
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await getSettingsCompat()

  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="navbar">
          <Link href="/" className="nav-logo">
            ✦ {settings.restaurant.name}
          </Link>
          <div className="flex gap-6">
            <Link href="/pos" className="nav-link">POS</Link>
            <Link href="/" className="nav-link">Tables</Link>
            <Link href="/menu" className="nav-link">Menu</Link>
            <Link href="/orders" className="nav-link">Orders</Link>
            <Link href="/dashboard" className="nav-link">Sales</Link>
            <Link href="/settings" className="nav-link">⚙️</Link>
          </div>
        </nav>
        <main className="container animate-fade-in">
          {children}
        </main>
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
