import { NextResponse } from 'next/server'
import { getCustomers } from '@/lib/db/customers'
import { requireAuth } from '@/lib/middleware/auth'

export const GET = requireAuth(async (req, { tenant }) => {
    try {
        const customers = await getCustomers(tenant.slug)
        return NextResponse.json(customers)
    } catch (error) {
        console.error('Failed to fetch customers:', error)
        return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }
})
