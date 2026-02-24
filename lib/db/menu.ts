import { ensureInitialized, getNextSequence } from './mongo'
import { Category, MenuItem } from '@/lib/db'
import { DbCategory, DbMenuItem } from './schema'

export async function getCategories(): Promise<Category[]> {
  const db = await ensureInitialized()

  // Aggregate to get item counts
  const categories = await db
    .collection<DbCategory>('categories')
    .aggregate([
      {
        $lookup: {
          from: 'menu_items',
          localField: '_id',
          foreignField: 'categoryId',
          as: 'items',
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          itemCount: { $size: '$items' },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray()

  return categories.map(
    (c) =>
      ({
        id: c._id,
        name: c.name,
        itemCount: c.itemCount,
      }) as unknown as Category
  )
}

export async function addCategory(name: string): Promise<Category> {
  const db = await ensureInitialized()
  const id = await getNextSequence('categoryId')
  await db.collection<DbCategory>('categories').insertOne({ _id: id, name })
  return { id, name } as unknown as Category
}

export async function updateCategory(id: number, name: string): Promise<Category | null> {
  const db = await ensureInitialized()
  const result = await db
    .collection<DbCategory>('categories')
    .updateOne({ _id: id }, { $set: { name } })
  if (result.matchedCount === 0) return null
  return { id, name } as unknown as Category
}

export async function deleteCategory(id: number): Promise<boolean> {
  const db = await ensureInitialized()
  const itemCount = await db.collection<DbMenuItem>('menu_items').countDocuments({ categoryId: id })
  if (itemCount > 0) return false // Prevent deletion if items exist

  const result = await db.collection<DbCategory>('categories').deleteOne({ _id: id })
  return result.deletedCount > 0
}

export async function getMenuItems(): Promise<MenuItem[]> {
  const db = await ensureInitialized()
  const items = await db
    .collection<DbMenuItem>('menu_items')
    .aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },
      { $unwind: '$categoryDetails' },
      { $sort: { categoryId: 1, name: 1 } },
    ])
    .toArray()

  return items.map(
    (m) =>
      ({
        id: m._id,
        name: m.name,
        price: m.price,
        categoryId: m.categoryId,
        category: { id: m.categoryId, name: m.categoryDetails.name },
      }) as unknown as MenuItem
  )
}

export async function getMenuItem(id: number): Promise<MenuItem | undefined> {
  const db = await ensureInitialized()
  const items = await db
    .collection<DbMenuItem>('menu_items')
    .aggregate([
      { $match: { _id: id } },
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },
      { $unwind: '$categoryDetails' },
    ])
    .toArray()

  if (!items.length) return undefined
  const m = items[0]
  return {
    id: m._id,
    name: m.name,
    price: m.price,
    categoryId: m.categoryId,
    category: { id: m.categoryId, name: m.categoryDetails.name },
  } as unknown as MenuItem
}

export async function addMenuItem(
  name: string,
  price: number,
  categoryId: number
): Promise<MenuItem | null> {
  const db = await ensureInitialized()
  const category = await db.collection<DbCategory>('categories').findOne({ _id: categoryId })
  if (!category) return null

  const id = await getNextSequence('menuItemId')
  await db.collection<DbMenuItem>('menu_items').insertOne({
    _id: id,
    name,
    price,
    categoryId,
  })

  return {
    id,
    name,
    price,
    categoryId,
    category: { id: categoryId, name: category.name },
  } as unknown as MenuItem
}

export async function updateMenuItem(
  id: number,
  updates: { name?: string; price?: number; categoryId?: number }
): Promise<MenuItem | null> {
  const db = await ensureInitialized()
  const result = await db
    .collection<DbMenuItem>('menu_items')
    .updateOne({ _id: id }, { $set: updates })
  if (result.matchedCount === 0) return null
  return (await getMenuItem(id)) || null
}

export async function deleteMenuItem(id: number): Promise<boolean> {
  const db = await ensureInitialized()
  const result = await db.collection<DbMenuItem>('menu_items').deleteOne({ _id: id })
  return result.deletedCount > 0
}
