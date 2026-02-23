import mysql from 'mysql2/promise'
import { ensureInitialized } from './pool'
import { Category, MenuItem } from '@/types'

export async function getCategories(): Promise<Category[]> {
    const pool = await ensureInitialized()
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(`
        SELECT c.id, c.name, COUNT(m.id) as itemCount
        FROM categories c
        LEFT JOIN menu_items m ON m.category_id = c.id
        GROUP BY c.id
        ORDER BY c.id
    `)
    return rows as Category[]
}

export async function addCategory(name: string): Promise<Category> {
    const pool = await ensureInitialized()
    const [result] = await pool.execute<mysql.ResultSetHeader>(
        'INSERT INTO categories (name) VALUES (?)',
        [name]
    )
    return { id: result.insertId, name, itemCount: 0 }
}

export async function updateCategory(id: number, name: string): Promise<Category | null> {
    const pool = await ensureInitialized()
    const [result] = await pool.execute<mysql.ResultSetHeader>(
        'UPDATE categories SET name = ? WHERE id = ?',
        [name, id]
    )
    if (result.affectedRows === 0) return null
    return { id, name }
}

export async function deleteCategory(id: number): Promise<boolean> {
    const pool = await ensureInitialized()
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()
        const [rows] = await conn.execute<mysql.RowDataPacket[]>(
            'SELECT COUNT(*) as c FROM menu_items WHERE category_id = ?',
            [id]
        )
        if (rows[0].c > 0) {
            await conn.rollback()
            return false
        }
        const [result] = await conn.execute<mysql.ResultSetHeader>(
            'DELETE FROM categories WHERE id = ?',
            [id]
        )
        await conn.commit()
        return result.affectedRows > 0
    } catch (err) {
        await conn.rollback()
        throw err
    } finally {
        conn.release()
    }
}

export async function getMenuItems(): Promise<MenuItem[]> {
    const pool = await ensureInitialized()
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(`
        SELECT m.id, m.name, m.price, c.name as categoryName, m.category_id as categoryId
        FROM menu_items m
        JOIN categories c ON c.id = m.category_id
        ORDER BY c.id, m.name
    `)
    return rows.map(r => ({
        id: r.id,
        name: r.name,
        price: parseFloat(r.price),
        category: { id: r.categoryId, name: r.categoryName }
    }))
}

export async function getMenuItem(id: number): Promise<MenuItem | undefined> {
    const pool = await ensureInitialized()
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
        `
        SELECT m.id, m.name, m.price, c.name as categoryName, m.category_id as categoryId
        FROM menu_items m
        JOIN categories c ON c.id = m.category_id
        WHERE m.id = ?
    `,
        [id]
    )
    if (!rows[0]) return undefined
    const r = rows[0]
    return {
        id: r.id,
        name: r.name,
        price: parseFloat(r.price),
        category: { id: r.categoryId, name: r.categoryName }
    }
}

export async function addMenuItem(
    name: string,
    price: number,
    categoryId: number
): Promise<MenuItem | null> {
    const pool = await ensureInitialized()
    const [catRows] = await pool.execute<mysql.RowDataPacket[]>(
        'SELECT name FROM categories WHERE id = ?',
        [categoryId]
    )
    if (catRows.length === 0) return null

    const [result] = await pool.execute<mysql.ResultSetHeader>(
        'INSERT INTO menu_items (name, price, category_id) VALUES (?, ?, ?)',
        [name, price, categoryId]
    )
    return {
        id: result.insertId,
        name,
        price,
        category: { id: categoryId, name: catRows[0].name }
    }
}

export async function updateMenuItem(
    id: number,
    updates: { name?: string; price?: number; categoryId?: number }
): Promise<MenuItem | null> {
    const pool = await ensureInitialized()
    const [existingRows] = await pool.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM menu_items WHERE id = ?',
        [id]
    )
    if (existingRows.length === 0) return null

    const existing = existingRows[0]
    const name = updates.name ?? existing.name
    const price = updates.price ?? existing.price
    const categoryId = updates.categoryId ?? existing.category_id

    await pool.execute('UPDATE menu_items SET name = ?, price = ?, category_id = ? WHERE id = ?', [
        name,
        price,
        categoryId,
        id,
    ])
    return (await getMenuItem(id))!
}

export async function deleteMenuItem(id: number): Promise<boolean> {
    const pool = await ensureInitialized()
    const [result] = await pool.execute<mysql.ResultSetHeader>(
        'DELETE FROM menu_items WHERE id = ?',
        [id]
    )
    return result.affectedRows > 0
}
