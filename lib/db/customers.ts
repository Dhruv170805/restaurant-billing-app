import { ensureInitialized } from './mongo'
import { DbCustomer } from './schema'

export async function upsertCustomerRecord(tenantId: string, name: string, phone: string, amountSpent: number): Promise<void> {
    const db = await ensureInitialized()

    // Format phone to extract numerical value (fallback to raw if formatting fails)
    const cleanPhone = phone.replace(/[^0-9+]/g, '')
    if (!cleanPhone) return // Skip if no valid phone number

    const now = new Date().toISOString()

    await db.collection<DbCustomer>('customers').updateOne(
        { _id: `${tenantId}_${cleanPhone}` },
        {
            $set: {
                tenantId: tenantId,
                name: name, // Always update to the latest name
                phone: cleanPhone,
                lastVisit: now
            },
            $inc: {
                totalOrders: 1,
                totalSpent: amountSpent
            }
        },
        { upsert: true }
    )
}

export async function getCustomers(tenantId: string): Promise<DbCustomer[]> {
    const db = await ensureInitialized()
    const customers = await db.collection<DbCustomer>('customers')
        .find({ tenantId })
        .sort({ lastVisit: -1 })
        .toArray()

    return customers
}
