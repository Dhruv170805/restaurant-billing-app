import { NextResponse } from 'next/server'
import { getCustomers } from '@/lib/db/customers'

export async function GET() {
    try {
        const customers = await getCustomers()
        return NextResponse.json(customers)
    } catch (error) {
        console.error('Failed to fetch customers:', error)
        return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }
}
