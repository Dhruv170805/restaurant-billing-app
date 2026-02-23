import mysql from 'mysql2/promise'
import { initializeSchema } from './schema'

const globalForMySQL = globalThis as unknown as {
    mysqlPool: mysql.Pool | undefined
}

export function getPool(): mysql.Pool {
    if (!globalForMySQL.mysqlPool) {
        const config = {
            host: process.env.MYSQL_HOST || 'localhost',
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DATABASE || 'restaurant_db',
            port: parseInt(process.env.MYSQL_PORT || '3306'),
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
        }

        globalForMySQL.mysqlPool = mysql.createPool(config)
    }
    return globalForMySQL.mysqlPool
}

let _initialized = false

export async function ensureInitialized(): Promise<mysql.Pool> {
    const pool = getPool()
    if (!_initialized) {
        await initializeSchema(pool)
        _initialized = true
    }
    return pool
}
