import Link from 'next/link'

export default function Home() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1>Dashboard</h1>
                <div className="flex gap-4">
                    <Link href="/pos" className="btn btn-primary">
                        New Order (POS)
                    </Link>
                    <Link href="/menu" className="btn btn-secondary">
                        Manage Menu
                    </Link>
                </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                <div className="card">
                    <h3>Total Orders</h3>
                    <p className="mt-4" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>0</p>
                    <p style={{ color: '#94a3b8' }}>Today</p>
                </div>
                <div className="card">
                    <h3>Total Revenue</h3>
                    <p className="mt-4" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>$0.00</p>
                    <p style={{ color: '#94a3b8' }}>Today</p>
                </div>
                <div className="card">
                    <h3>Active Items</h3>
                    <p className="mt-4" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>0</p>
                    <p style={{ color: '#94a3b8' }}>In Menu</p>
                </div>
            </div>

            <div className="card">
                <h3>Quick Actions</h3>
                <div className="flex gap-4 mt-4">
                    <Link href="/pos" className="btn btn-secondary">
                        Open POS Terminal
                    </Link>
                    <Link href="/orders" className="btn btn-secondary">
                        View All Orders
                    </Link>
                    <Link href="/menu" className="btn btn-secondary">
                        Add Menu Item
                    </Link>
                </div>
            </div>
        </div>
    )
}
