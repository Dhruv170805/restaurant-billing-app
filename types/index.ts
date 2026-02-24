import { DbOrder } from '@/lib/db/schema'

export interface PaginatedOrders {
  orders: DbOrder[]
  total: number
  page: number
  limit: number
  totalPages: number
}
