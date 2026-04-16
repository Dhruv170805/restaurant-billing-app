import { Document } from 'mongodb'

// ── Existing Domain Types (multi-tenant: all gain tenantId) ──────────────────

export interface DbCategory extends Document {
  _id: number
  tenantId: string
  name: string
}

export interface DbCustomer extends Document {
  _id: string
  tenantId: string
  name: string
  phone: string
  totalOrders: number
  totalSpent: number
  lastVisit: string
}

export interface DbMenuItem extends Document {
  _id: number
  tenantId: string
  name: string
  price: number
  categoryId: number
}

export interface DbOrder extends Document {
  _id: number
  tenantId: string
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
  pdfUrl?: string // MinIO URL once invoice is generated
}

export interface DbSettings extends Document {
  _id: string
  tenantId: string
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
  ownerPhone?: string
  theme?: 'light' | 'dark' | 'system'
  billGreeting?: string
}

// ── New: Multi-Tenancy Types ──────────────────────────────────────────────────

export interface DbTenantTheme {
  primary: string   // e.g. "#f37c22"
  accent: string    // e.g. "#ffffff"
  font: string      // e.g. "Inter"
}

export interface DbTenantConfig {
  taxEnabled: boolean
  taxRate: number
  taxLabel: string
  currencySymbol: string
  currencyCode: string
  currencyLocale: string
  maxTables: number
  maxMenuItems: number
  address?: string
  phone?: string
  tagline?: string
  gstin?: string
}

export interface DbTenant extends Document {
  _id: string                   // same as slug
  slug: string                  // e.g. "acme"
  name: string                  // e.g. "Acme Restaurant"
  domain?: string               // custom domain (optional)
  logoUrl?: string              // MinIO URL
  theme: DbTenantTheme
  config: DbTenantConfig
  plan: 'free' | 'starter' | 'pro'
  planExpiresAt?: string        // ISO date, undefined = lifetime
  suspended: boolean
  createdAt: string
  updatedAt: string
}

export interface DbUserRefreshToken {
  hash: string                  // bcrypt hash of the refresh JWT
  deviceId: string              // arbitrary client identifier
  createdAt: string
  expiresAt: string
}

export interface DbUser extends Document {
  _id: string                   // ObjectId as string
  tenantId: string
  email: string
  passwordHash: string
  name: string
  roles: Array<'admin' | 'cashier' | 'superadmin'>
  refreshTokens: DbUserRefreshToken[]
  totpSecret?: string           // base32 TOTP secret
  totpEnabled: boolean
  emailVerified: boolean
  verificationToken?: string    // for email verify flow
  resetToken?: string           // for password reset flow
  resetTokenExpiresAt?: string
  createdAt: string
  updatedAt: string
}

// ── New: Audit Log ────────────────────────────────────────────────────────────

export interface DbAuditLog extends Document {
  _id: string
  type: string                  // e.g. 'LOGIN', 'IMPERSONATE', 'PLAN_CHANGE'
  actorId: string               // userId who performed action
  actorEmail: string
  tenantId: string
  targetId?: string             // affected resource id
  payload?: Record<string, unknown>
  ip?: string
  createdAt: string
}

// ── New: Counter ──────────────────────────────────────────────────────────────

export interface DbCounter extends Document {
  _id: string
  seq: number
}

// ── Re-exported subtypes for external use ────────────────────────────────────

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
  yesterdayRevenue: number
  avgOrderValue: number
  topItems: { name: string; qty: number; revenue: number }[]
  weeklyAvg: number[]
  recentOrders: DbOrder[]
  unpaidOrders: DbOrder[]
  hourlyRevenue?: number[]
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
