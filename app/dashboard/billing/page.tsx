'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('API Error')
  return res.json()
})

interface UsageData {
  current: number
  max: number | null
}

interface BillingResponse {
  currentPlan: string
  planName: string
  features: Record<string, boolean | number>
  usage: {
    tables: UsageData
    menuItems: UsageData
    ordersThisMonth: number
  }
  planExpiresAt: string | null
}

export default function BillingPage() {
  const { data, error, mutate } = useSWR<BillingResponse>('/api/billing', fetcher)
  const [upgrading, setUpgrading] = useState(false)

  const handleUpgrade = async (planId: string) => {
    setUpgrading(true)
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedPlan: planId }),
      })

      if (res.ok) {
        const json = await res.json()
        toast.success(json.message || 'Upgrade request submitted.')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to submit upgrade request.')
      }
    } catch (e) {
      toast.error('Network error submitting request.')
    }
    setUpgrading(false)
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--foreground-subtle)' }}>
        <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</p>
        <p>Failed to load billing information</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--foreground-subtle)' }}>
        <p style={{ fontSize: '1.1rem' }}>Loading billing...</p>
      </div>
    )
  }

  const { currentPlan, planName, usage, planExpiresAt } = data

  const renderUsageBar = (name: string, usageData: UsageData) => {
    const isUnlimited = usageData.max === null;
    const percentage = isUnlimited ? 0 : Math.min((usageData.current / usageData.max!) * 100, 100);
    const isCritical = !isUnlimited && percentage > 90;

    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="flex justify-between" style={{ marginBottom: '0.4rem', fontSize: '0.95rem' }}>
          <span style={{ fontWeight: 600 }}>{name}</span>
          <span style={{ color: 'var(--foreground-muted)' }}>
            {usageData.current} / {isUnlimited ? '∞' : usageData.max}
          </span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: isUnlimited ? '100%' : `${percentage}%`,
            background: isUnlimited ? 'var(--primary, #10b981)' : isCritical ? '#ef4444' : 'var(--primary, #3b82f6)',
            transition: 'width 0.5s ease-out'
          }} />
        </div>
        {isCritical && !isUnlimited && (
          <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.4rem' }}>
            You are approaching your plan limits. Consider upgrading.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-2">
        <div>
           <Link href="/settings" style={{ fontSize: '0.9rem', color: 'var(--primary)', textDecoration: 'none', marginBottom: '0.5rem', display: 'flex' }}>&larr; Back to Settings</Link>
           <h1>💳 Billing & Plan</h1>
           <p style={{ color: 'var(--foreground-muted)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
             Manage your restaurant subscription limits.
           </p>
        </div>
      </div>

      <div className="card text-center" style={{ padding: '3rem 2rem', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
         <p style={{ fontSize: '1rem', color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Current Plan</p>
         <h2 style={{ fontSize: '3rem', fontWeight: 900, margin: '0.5rem 0', color: currentPlan === 'free' ? 'var(--foreground)' : 'var(--primary)' }}>
           {planName.toUpperCase()}
         </h2>
         {planExpiresAt && (
           <p style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>
             Renews on: {new Date(planExpiresAt).toLocaleDateString()}
           </p>
         )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>
          📈 Resource Usage
        </h3>
        
        {renderUsageBar('Tables', usage.tables)}
        {renderUsageBar('Menu Items', usage.menuItems)}
        
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
           <p style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>Orders processed this month: <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{usage.ordersThisMonth}</span></p>
        </div>
      </div>

      {currentPlan !== 'pro' && (
        <div className="card flex justify-between items-center" style={{ background: 'rgba(243, 124, 34, 0.05)', borderColor: 'rgba(243, 124, 34, 0.2)' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.3rem' }}>Ready for more?</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>Upgrade to PRO for unlimited tables, GST invoices, and advanced analytics.</p>
          </div>
          <button 
             className="btn btn-primary" 
             onClick={() => handleUpgrade('pro')} 
             disabled={upgrading}
             style={{ padding: '0.8rem 1.5rem', fontWeight: 700 }}
          >
             {upgrading ? 'Sending...' : 'Request Upgrade 🚀'}
          </button>
        </div>
      )}

    </div>
  )
}
