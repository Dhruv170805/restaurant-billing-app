import mysql from 'mysql2/promise'
import { ensureInitialized } from './pool'
import { AppSettings } from '@/types'

export async function getSettings(): Promise<AppSettings> {
    const pool = await ensureInitialized()
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT `key`, value FROM settings')
    const map = new Map(rows.map((r: mysql.RowDataPacket) => [r.key, r.value]))

    return {
        restaurantName: (map.get('restaurantName') as string) || 'Restaurant',
        restaurantAddress: (map.get('restaurantAddress') as string) || '',
        restaurantPhone: (map.get('restaurantPhone') as string) || '',
        restaurantTagline: (map.get('restaurantTagline') as string) || '',
        currencyLocale: (map.get('currencyLocale') as string) || 'en-IN',
        currencyCode: (map.get('currencyCode') as string) || 'INR',
        currencySymbol: (map.get('currencySymbol') as string) || '₹',
        taxEnabled: (map.get('taxEnabled') as string) === 'true',
        taxRate: parseFloat((map.get('taxRate') as string) || '0'),
        taxLabel: (map.get('taxLabel') as string) || 'GST',
        tableCount: parseInt((map.get('tableCount') as string) || '12'),
    }
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    const pool = await ensureInitialized()
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                await conn.execute(
                    'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
                    [key, String(value)]
                )
            }
        }
        await conn.commit()
    } catch (err) {
        await conn.rollback()
        throw err
    } finally {
        conn.release()
    }

    return getSettings()
}

