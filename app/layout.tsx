import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Restaurant Billing System',
  description: 'A complete restaurant billing and management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <div className="logo">
            <Link href="/" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
              RestoBill
            </Link>
          </div>
          <div className="flex gap-4">
            <Link href="/" className="nav-link">Dashboard</Link>
            <Link href="/menu" className="nav-link">Menu</Link>
            <Link href="/pos" className="nav-link">POS</Link>
            <Link href="/orders" className="nav-link">Orders</Link>
          </div>
        </nav>
        <main className="container animate-fade-in">
          {children}
        </main>
      </body>
    </html>
  )
}
