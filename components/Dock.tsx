"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, BookOpen, ClipboardList, LineChart, Settings } from 'lucide-react'

export function Dock() {
    const pathname = usePathname()

    const navItems = [
        { href: '/', label: 'Tables', icon: LayoutGrid },
        { href: '/menu', label: 'Menu', icon: BookOpen },
        { href: '/orders', label: 'Orders', icon: ClipboardList },
        { href: '/dashboard', label: 'Sales', icon: LineChart },
        { href: '/settings', label: 'Settings', icon: Settings },
    ]

    return (
        <div className="dock-container">
            <nav className="dock">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`dock-item ${isActive ? 'active' : ''}`}
                        >
                            <div className="dock-icon-wrapper">
                                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="dock-label">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
