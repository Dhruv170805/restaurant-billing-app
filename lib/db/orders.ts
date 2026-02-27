import { ensureInitialized, getNextSequence } from './mongo'
import { PaginatedOrders } from '@/types'
import { Order, OrderItem } from '@/lib/db'
import { DbOrder, DbMenuItem } from './schema'
import { upsertCustomerRecord } from './customers'

export async function getOrders(): Promise<Order[]> {
  return (await getOrdersPaginated(1, 1000)).orders
}

export async function getOrdersPaginated(
  page: number = 1,
  limit: number = 20
): Promise<PaginatedOrders> {
  const db = await ensureInitialized()
  const offset = (page - 1) * limit

  const ordersCollection = db.collection<DbOrder>('orders')
  const total = await ordersCollection.countDocuments()

  const docs = await ordersCollection
    .find()
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray()

  const orders = docs.map((doc) => ({ ...doc, id: doc._id }) as unknown as Order)

  return {
    orders,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getOrdersByDateRange(from: string, to: string): Promise<Order[]> {
  const db = await ensureInitialized()
  const docs = await db
    .collection<DbOrder>('orders')
    .find({
      createdAt: { $gte: from, $lte: to },
    })
    .sort({ createdAt: -1 })
    .toArray()

  return docs.map((doc) => ({ ...doc, id: doc._id }) as unknown as Order)
}

export async function getOrder(id: number): Promise<Order | undefined> {
  const db = await ensureInitialized()
  const doc = await db.collection<DbOrder>('orders').findOne({ _id: id })
  if (!doc) return undefined
  return { ...doc, id: doc._id } as unknown as Order
}

export async function createOrder(
  items: OrderItem[],
  _clientTotal: number,
  tableNumber: number,
  customerName?: string,
  customerPhone?: string
): Promise<Order> {
  const db = await ensureInitialized()

  let serverTotal = 0
  const processedItems = []

  for (const item of items) {
    const menuItem = await db.collection<DbMenuItem>('menu_items').findOne({ _id: item.menuItemId })
    if (menuItem) {
      item.price = Math.round(menuItem.price * 100) / 100
      item.name = menuItem.name
    }
    serverTotal += Math.round(item.price * item.quantity * 100) / 100

    processedItems.push({
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      printedQuantity: 0,
    })
  }

  const total = Math.round(serverTotal * 100) / 100
  const now = new Date().toISOString()
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const startOfDayFormatted = startOfDay.toISOString()

  const c = await db.collection<DbOrder>('orders').countDocuments({
    createdAt: { $gte: startOfDayFormatted },
  })
  const tokenNumber = c + 1

  const orderId = await getNextSequence('orderId')

  const newOrder: DbOrder = {
    _id: orderId,
    tokenNumber,
    tableNumber,
    status: 'PENDING',
    paymentMethod: null,
    ...(customerName ? { customerName } : {}),
    ...(customerPhone ? { customerPhone } : {}),
    subtotal: total,
    tax: 0,
    total,
    createdAt: now,
    updatedAt: now,
    items: processedItems,
    itemCount: processedItems.reduce((acc, item) => acc + item.quantity, 0),
  }

  await db.collection<DbOrder>('orders').insertOne(newOrder)
  return (await getOrder(orderId))!
}

export async function addItemsToOrder(orderId: number, items: OrderItem[]): Promise<Order> {
  const db = await ensureInitialized()
  const order = await db.collection<DbOrder>('orders').findOne({ _id: orderId })
  if (!order) throw new Error('Order not found')
  if (order.status !== 'PENDING') throw new Error('Can only add items to PENDING orders')

  let addedTotal = 0
  const newItems = [...(order.items || [])]

  for (const item of items) {
    const menuItem = await db.collection<DbMenuItem>('menu_items').findOne({ _id: item.menuItemId })
    if (menuItem) {
      item.price = Math.round(menuItem.price * 100) / 100
      item.name = menuItem.name
    }
    addedTotal += Math.round(item.price * item.quantity * 100) / 100

    const existingItemIndex = newItems.findIndex((i) => i.menuItemId === item.menuItemId)
    if (existingItemIndex > -1) {
      newItems[existingItemIndex].quantity += item.quantity
      newItems[existingItemIndex].price = item.price // Update price if changed
      newItems[existingItemIndex].name = item.name // Update name to enforce latest
    } else {
      newItems.push({
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        printedQuantity: 0,
      })
    }
  }

  const newTotal = Math.round((order.total + addedTotal) * 100) / 100
  const now = new Date().toISOString()

  await db.collection<DbOrder>('orders').updateOne(
    { _id: orderId },
    {
      $set: {
        items: newItems,
        total: newTotal,
        updatedAt: now,
      },
    }
  )

  return (await getOrder(orderId))!
}

export async function updateOrderStatus(
  id: number,
  status: 'PENDING' | 'PAID' | 'UNPAID' | 'CANCELLED',
  paymentMethod?: 'CASH' | 'ONLINE' | 'UNPAID',
  updates?: { customerName?: string; customerPhone?: string }
): Promise<Order | null> {
  const db = await ensureInitialized()
  const now = new Date().toISOString()

  const updateDoc: Partial<DbOrder> = { status, updatedAt: now }
  if (paymentMethod) {
    updateDoc.paymentMethod = paymentMethod
  }
  if (updates?.customerName) updateDoc.customerName = updates.customerName
  if (updates?.customerPhone) updateDoc.customerPhone = updates.customerPhone

  const result = await db.collection<DbOrder>('orders').updateOne({ _id: id }, { $set: updateDoc })

  if (result.matchedCount === 0) return null

  const updatedOrder = await getOrder(id)
  if (!updatedOrder) return null

  // Upsert Customer CRM logic
  if (status === 'PAID') {
    const name = updatedOrder.customerName
    const phone = updatedOrder.customerPhone
    if (name && phone) {
      // Async fire-and-forget to upsert into customer database
      upsertCustomerRecord(name, phone, updatedOrder.total).catch(e => console.error('Failed CRM update:', e))
    }
  }

  return updatedOrder
}

export async function deleteOrder(id: number): Promise<boolean> {
  const db = await ensureInitialized()
  const result = await db.collection<DbOrder>('orders').deleteOne({ _id: id })
  return result.deletedCount > 0
}

export async function markKOTPrinted(orderId: number): Promise<Order | null> {
  const db = await ensureInitialized()
  const order = await db.collection<DbOrder>('orders').findOne({ _id: orderId })
  if (!order) return null

  const newItems = [...(order.items || [])]
  for (const item of newItems) {
    item.printedQuantity = item.quantity
  }

  const now = new Date().toISOString()
  await db.collection<DbOrder>('orders').updateOne(
    { _id: orderId },
    { $set: { items: newItems, updatedAt: now } }
  )

  return (await getOrder(orderId)) || null
}
