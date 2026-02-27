import { Document } from 'mongodb'

export interface DbCategory extends Document {
  _id: number
  name: string
}

export interface DbCustomer extends Document {
  _id: string // Auto-generated string ID or Phone Number
  name: string
  phone: string
  totalOrders: number
  totalSpent: number
  lastVisit: string // ISO Date
}

export interface DbMenuItem extends Document {
  _id: number
  name: string
  price: number
  categoryId: number
}

export interface DbOrder extends Document {
  _id: number
  tableNumber: number | null
  tokenNumber: number
  status: 'PENDING' | 'PAID' | 'UNPAID' | 'CANCELLED'
  customerName?: string
  customerPhone?: string
  subtotal: number
  tax: number
  total: number
  createdAt: string
  updatedAt: string
  paymentMethod: string | null
  items: { menuItemId: number; name: string; quantity: number; price: number; printedQuantity?: number }[]
  itemCount: number
}

export interface DbSettings extends Document {
  _id: string // typically 'app_settings'
  restaurantName: string
  restaurantAddress: string
  restaurantPhone: string
  restaurantTagline: string
  currencySymbol: string
  currencyCode: string
  currencyLocale: string
  taxEnabled: boolean
  taxRate: number
  taxLabel: string
  tableCount: number
  timezone: string
  ownerPhone?: string // WhatsApp Business / Contact Number
}

export interface DbCounter extends Document {
  _id: string
  seq: number
}

export interface DbOrderItem {
  menuItemId: number
  name: string
  quantity: number
  price: number
  printedQuantity?: number
}

export interface DbDashboardStats {
  todayRevenue: number
  monthlyRevenue: number
  cashRevenue: number
  onlineRevenue: number
  unpaidRevenue: number
  todayOrders: number
  monthlyOrders: number
  pendingOrders: number
  recentOrders: DbOrder[]
  unpaidOrders: DbOrder[]
}

export interface DbTableInfo {
  number: number
  status: 'available' | 'occupied'
  order: {
    id: number
    tokenNumber: number
    total: number
    itemCount: number
    createdAt: string
  } | null
}
