'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import { useSettings } from '@/hooks/useData'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

const BASE_URL = 'https://restaurant-billing-app-self.vercel.app'

function useTableCount() {
    const { settings } = useSettings()
    return (settings?.tableCount as number) || 12
}

function QRTableCard({ tableNumber, restaurantName }: { tableNumber: number; restaurantName: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const url = `${BASE_URL}/order/table/${tableNumber}`
    const [generated, setGenerated] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return
        QRCode.toCanvas(canvasRef.current, url, {
            width: 180,
            margin: 2,
            color: { dark: '#0B0B0F', light: '#FFFFFF' },
            errorCorrectionLevel: 'M',
        }).then(() => setGenerated(true))
    }, [url])

    return (
        <div
            className="card"
            style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                borderTop: '2px solid rgba(255,106,0,0.35)',
                boxShadow: '0 0 28px rgba(255,106,0,0.08), var(--glass-shadow)',
            }}
        >
            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                Table {tableNumber}
            </div>
            <div
                style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 196,
                    height: 196,
                    position: 'relative',
                }}
            >
                <canvas ref={canvasRef} style={{ display: generated ? 'block' : 'none' }} />
                {!generated && (
                    <div style={{ color: '#999', fontSize: 12 }}>Generating…</div>
                )}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)', textAlign: 'center', maxWidth: 160, wordBreak: 'break-all' }}>
                {url}
            </p>
            <button
                onClick={() => {
                    const canvas = canvasRef.current
                    if (!canvas) return
                    const link = document.createElement('a')
                    link.download = `table-${tableNumber}-qr.png`
                    link.href = canvas.toDataURL('image/png')
                    link.click()
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.9rem', width: '100%' }}
            >
                ⬇ Download QR
            </button>
        </div>
    )
}

export default function QRCodesPage() {
    const tableCount = useTableCount()
    const { settings } = useSettings()
    const restaurantName = settings?.restaurantName || 'Restaurant'

    const handlePrintAll = () => window.print()

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <style dangerouslySetInnerHTML={{
                __html: `
          @media print {
            .no-print { display: none !important; }
            .card { box-shadow: none !important; border: 1px solid #eee !important; break-inside: avoid; }
            body { background: white !important; color: black !important; }
          }
        `
            }} />

            <div className="flex justify-between items-center no-print" style={{ marginBottom: '0.5rem' }}>
                <PageHeader title="Table QR Codes" />
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>
                        {tableCount} tables · Printable
                    </p>
                    <button onClick={handlePrintAll} className="btn" style={{ gap: '0.5rem' }}>
                        🖨 Print All
                    </button>
                </div>
            </div>

            <div
                style={{
                    background: 'rgba(255,106,0,0.06)',
                    border: '1px solid rgba(255,106,0,0.2)',
                    borderRadius: 12,
                    padding: '0.85rem 1.2rem',
                    marginBottom: '1.5rem',
                    fontSize: '0.875rem',
                    color: 'rgba(255,255,255,0.7)',
                }}
                className="no-print"
            >
                📲 <strong>How it works:</strong> Print these QR codes and place them on each table. Customers scan to view their order status and bill in real-time. No app download needed.
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '1rem',
                }}
            >
                {Array.from({ length: tableCount }, (_, i) => (
                    <QRTableCard
                        key={i + 1}
                        tableNumber={i + 1}
                        restaurantName={restaurantName}
                    />
                ))}
            </div>
        </div>
    )
}
