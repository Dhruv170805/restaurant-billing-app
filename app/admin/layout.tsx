import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Panel — NEXUS POS',
  description: 'NEXUS POS Superadmin Panel',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Admin Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: '54px', display: 'flex', alignItems: 'center',
        gap: '2rem', padding: '0 2rem',
        background: 'rgba(10,10,20,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Link href="/admin/tenants" style={{
          fontWeight: 900, fontSize: '1.1rem', textDecoration: 'none',
          background: 'linear-gradient(135deg,#f37c22,#e8521a)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          ⚡ NEXUS Admin
        </Link>
        <div style={{ display: 'flex', gap: '1.25rem', flex: 1 }}>
          {[
            { label: 'Tenants', href: '/admin/tenants' },
            { label: 'Audit Log', href: '/admin/audit' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              color: 'rgba(255,255,255,0.6)', textDecoration: 'none',
              fontSize: '0.875rem', fontWeight: 600,
              transition: 'color 0.2s',
            }}>
              {item.label}
            </Link>
          ))}
        </div>
        <Link href="/" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
          ← Back to App
        </Link>
      </nav>

      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  )
}
