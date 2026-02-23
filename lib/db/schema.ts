import mysql from 'mysql2/promise'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

export async function initializeSchema(pool: mysql.Pool): Promise<void> {
    const conn = await pool.getConnection()
    try {
        await conn.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)

        await conn.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                price DECIMAL(10,2) NOT NULL CHECK(price > 0),
                category_id INT NOT NULL,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)

        await conn.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                token_number INT NOT NULL,
                table_number INT NOT NULL,
                status ENUM('PENDING', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
                total DECIMAL(10,2) NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                INDEX idx_orders_status (status),
                INDEX idx_orders_table_number (table_number),
                INDEX idx_orders_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)

        await conn.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                menu_item_id INT NOT NULL,
                name VARCHAR(200) NOT NULL,
                quantity INT NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                INDEX idx_order_items_order_id (order_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)

        await conn.query(`
            CREATE TABLE IF NOT EXISTS settings (
                \`key\` VARCHAR(100) PRIMARY KEY,
                value TEXT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)

        try {
            await conn.query(`
                ALTER TABLE orders 
                ADD COLUMN payment_method ENUM('CASH', 'ONLINE') NULL
            `)
        } catch (err: any) {
            if (err.code !== 'ER_DUP_FIELDNAME') {
                console.error('Failed to add payment_method column:', err)
            }
        }
    } finally {
        conn.release()
    }

    await seedFromJson(pool)
    await seedDefaultSettings(pool)
}

async function seedFromJson(pool: mysql.Pool): Promise<void> {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as c FROM categories')
    if (rows[0].c > 0) return

    const DATA_DIR = join(process.cwd(), 'data')
    const menuJsonPath = join(DATA_DIR, 'menu.json')
    if (!existsSync(menuJsonPath)) return

    const conn = await pool.getConnection()
    try {
        const raw = readFileSync(menuJsonPath, 'utf-8')
        const data = JSON.parse(raw)

        await conn.beginTransaction()

        const catMap = new Map<string, number>()
        for (const cat of data.categories) {
            const [result] = await conn.execute<mysql.ResultSetHeader>(
                'INSERT INTO categories (name) VALUES (?)',
                [cat.name]
            )
            catMap.set(cat.name, result.insertId)
        }

        for (const item of data.items) {
            const catId = catMap.get(item.category)
            if (catId) {
                await conn.execute('INSERT INTO menu_items (name, price, category_id) VALUES (?, ?, ?)', [
                    item.name,
                    item.price,
                    catId,
                ])
            }
        }

        await conn.commit()
        console.log('✅ Seeded database from menu.json')
    } catch (err) {
        await conn.rollback()
        console.error('Failed to seed from menu.json:', err)
    } finally {
        conn.release()
    }
}

async function seedDefaultSettings(pool: mysql.Pool): Promise<void> {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as c FROM settings')
    if (rows[0].c > 0) return

    const defaults: Record<string, string> = {
        restaurantName: 'Shreeji',
        restaurantAddress: 'Rajkot, Gujarat, India',
        restaurantPhone: '+91 98765 43210',
        restaurantTagline: 'Thank you for dining with us! ✨',
        currencySymbol: '₹',
        currencyCode: 'INR',
        currencyLocale: 'en-IN',
        taxEnabled: 'false',
        taxRate: '0',
        taxLabel: 'GST',
        tableCount: '12',
    }

    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()
        for (const [key, value] of Object.entries(defaults)) {
            await conn.execute('INSERT INTO settings (`key`, value) VALUES (?, ?)', [key, value])
        }
        await conn.commit()
    } catch (err) {
        await conn.rollback()
        throw err
    } finally {
        conn.release()
    }
}
