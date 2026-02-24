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
  DbMenuItem as MenuItem,
  DbCategory as Category,
  DbOrder as Order,
  DbOrderItem as OrderItem,
  DbSettings as AppSettings,
  DbTableInfo as TableInfo,
  DbDashboardStats as DashboardStats,
} from './db/schema'
