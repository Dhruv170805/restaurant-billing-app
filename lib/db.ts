// ── Central Entry Point for Database Operations ───────────────────
// This file re-exports functions from modular domain files to maintain
// backward compatibility while providing a cleaner architecture.

export * from './db/mongo'
export * from './db/menu'
export * from './db/orders'
export * from './db/settings'
export * from './db/tables'


// Export types for external use
export type {
  MenuItem,
  Category,
  Order,
  OrderItem,
  AppSettings,
  TableInfo,
  DashboardStats
} from '@/types'
