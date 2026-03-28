'use client'

import React from 'react'

const pulse: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--glass-bg) 25%, var(--glass-bg-hover) 50%, var(--glass-bg) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-pulse 1.4s ease infinite',
  borderRadius: '6px',
}

const style = `
@keyframes skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`

function Bar({
  w = '100%',
  h = 16,
  mb = 0,
  r = 6,
  style: customStyle,
}: {
  w?: string | number
  h?: number
  mb?: number
  r?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        ...pulse,
        width: w,
        height: h,
        marginBottom: mb,
        borderRadius: r,
        flexShrink: 0,
        ...customStyle,
      }}
    />
  )
}

export function SkeletonCard({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <style>{style}</style>
      <div className="card" style={{ padding: '1.5rem' }}>
        {children}
      </div>
    </>
  )
}

export function TablesSkeleton() {
  return (
    <>
      <style>{style}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Bar w={120} h={28} mb={8} />
            <Bar w={200} h={14} />
          </div>
          <Bar w={80} h={14} />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="card"
              style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Bar w={40} h={32} r={4} />
                <Bar w={60} h={20} r={9999} />
              </div>
              <Bar w="100%" h={14} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export function MenuSkeleton() {
  return (
    <>
      <style>{style}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Bar w={180} h={28} mb={8} />
            <Bar w={240} h={14} />
          </div>
          <Bar w={140} h={38} r={10} />
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Bar w={280} h={38} r={10} />
          {[80, 70, 90, 60, 80].map((w, i) => (
            <Bar key={i} w={w} h={32} r={9999} />
          ))}
        </div>
        {[0, 1].map((g) => (
          <div key={g} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Bar w={120} h={16} />
              <Bar w={50} h={22} r={9999} />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="card"
                  style={{ padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
                >
                  <Bar w="80%" h={14} />
                  <Bar w={60} h={22} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem' }}>
                    <Bar w={60} h={18} r={9999} />
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <Bar w={28} h={24} r={7} />
                      <Bar w={28} h={24} r={7} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export function OrdersSkeleton() {
  return (
    <>
      <style>{style}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Bar w={160} h={28} mb={8} />
            <Bar w={240} h={14} />
          </div>
          <Bar w={120} h={38} r={10} />
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 80px 100px 80px', gap: '1rem', alignItems: 'center' }}>
              {['80px', '60%', '60px', '60px', '80px', '60px'].map((w, i) => (
                <Bar key={i} w={w} h={12} />
              ))}
            </div>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                padding: '0.85rem 1rem',
                borderBottom: '1px solid var(--glass-border)',
                display: 'grid',
                gridTemplateColumns: '80px 1fr 80px 80px 100px 80px',
                gap: '1rem',
                alignItems: 'center',
              }}
            >
              <Bar w={50} h={14} />
              <Bar w="70%" h={14} />
              <Bar w={50} h={14} />
              <Bar w={55} h={14} />
              <Bar w={70} h={22} r={9999} />
              <Bar w={55} h={30} r={10} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export function DashboardSkeleton() {
  return (
    <>
      <style>{style}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Bar w={200} h={28} />
          <Bar w={100} h={36} r={10} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <Bar w={100} h={12} />
                  <Bar w={120} h={36} />
                </div>
                <Bar w={48} h={48} r={12} />
              </div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <Bar w={180} h={18} mb={20} />
          <Bar w="100%" h={220} r={8} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Bar w={160} h={18} />
            <Bar w="100%" h={160} r={8} />
          </div>
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Bar w={140} h={18} />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0' }}>
                <Bar w={40} h={14} />
                <Bar w={60} h={20} r={9999} />
                <Bar w={60} h={14} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export function POSSkeleton() {
  return (
    <>
      <style>{style}</style>
      <div style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 120px)' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Bar w={240} h={40} r={10} />
            {[80, 70, 90, 60, 80, 70].map((w, i) => (
              <Bar key={i} w={w} h={32} r={9999} />
            ))}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.65rem',
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="card"
                style={{ padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', minHeight: 110 }}
              >
                <Bar w="80%" h={14} />
                <Bar w={70} h={20} />
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ width: 380, display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
            <Bar w={120} h={20} />
            <Bar w={80} h={22} r={9999} />
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem' }}>
            <Bar w={48} h={48} r={48} />
            <Bar w={160} h={14} />
          </div>
          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Bar w={60} h={14} />
              <Bar w={80} h={24} />
            </div>
            <Bar w="100%" h={52} r={10} />
          </div>
        </div>
      </div>
    </>
  )
}

export function OrderDetailSkeleton() {
  return (
    <>
      <style>{style}</style>
      <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Bar w={80} h={36} r={10} />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Bar w={110} h={36} r={10} />
            <Bar w={120} h={36} r={10} />
            <Bar w={120} h={36} r={10} />
          </div>
        </div>
        <div className="card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ textAlign: 'center', paddingBottom: '0.5rem', borderBottom: '2px solid var(--glass-border)', marginBottom: '0.5rem' }}>
            <Bar w={200} h={20} mb={8} style={{ margin: '0 auto 8px' }} />
            <Bar w={160} h={12} style={{ margin: '0 auto 4px' }} />
            <Bar w={120} h={12} style={{ margin: '0 auto' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Bar w="80%" h={12} />
            <Bar w="60%" h={12} />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 60px 70px', gap: '0.5rem', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px dotted var(--glass-border)' }}>
              <Bar w="70%" h={12} />
              <Bar w={30} h={12} />
              <Bar w={45} h={12} />
              <Bar w={50} h={12} />
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
            <Bar w={160} h={12} />
            <Bar w={180} h={20} />
          </div>
        </div>
      </div>
    </>
  )
}
