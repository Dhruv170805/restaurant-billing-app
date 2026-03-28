import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import type { TableInfo, AppSettings, MenuItem, Category, Order, DashboardStats } from '@/lib/db'

const STALE = {
  settings: 60_000,
  tables: 8_000,
  menu: 30_000,
  categories: 30_000,
  orders: 8_000,
  dashboard: 25_000,
}

export function useSettings() {
  const { data, error, mutate, isLoading } = useSWR<AppSettings>('/api/settings', fetcher, {
    refreshInterval: STALE.settings,
    revalidateOnFocus: false,
    revalidateIfStale: false,
    dedupingInterval: STALE.settings,
  })
  return { settings: data, isLoading: isLoading && !data, isError: error, mutate }
}

export function useTables() {
  const { data, error, mutate, isLoading } = useSWR<TableInfo[]>('/api/tables', fetcher, {
    refreshInterval: STALE.tables,
    revalidateOnFocus: true,
    dedupingInterval: 2000,
    keepPreviousData: true,
  })
  return { tables: data ?? [], isLoading: isLoading && !data, isError: error, mutate }
}

export function useMenu() {
  const { data, error, mutate, isLoading } = useSWR<MenuItem[]>('/api/menu', fetcher, {
    refreshInterval: STALE.menu,
    revalidateOnFocus: false,
    dedupingInterval: STALE.menu,
    keepPreviousData: true,
  })
  return { items: data ?? [], isLoading: isLoading && !data, isError: error, mutate }
}

export function useCategories() {
  const { data, error, mutate, isLoading } = useSWR<Category[]>('/api/categories', fetcher, {
    refreshInterval: STALE.categories,
    revalidateOnFocus: false,
    dedupingInterval: STALE.categories,
    keepPreviousData: true,
  })
  return { categories: data ?? [], isLoading: isLoading && !data, isError: error, mutate }
}

export function useOrders() {
  const { data, error, mutate, isLoading } = useSWR<Order[]>('/api/orders', fetcher, {
    refreshInterval: STALE.orders,
    revalidateOnFocus: true,
    dedupingInterval: 3000,
    keepPreviousData: true,
  })
  return { orders: data ?? [], isLoading: isLoading && !data, isError: error, mutate }
}

export function useDashboard() {
  const interval = Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL) || STALE.dashboard
  const { data, error, mutate, isLoading } = useSWR<DashboardStats>('/api/dashboard', fetcher, {
    refreshInterval: interval,
    revalidateOnFocus: false,
    dedupingInterval: interval,
    keepPreviousData: true,
  })
  return { stats: data, isLoading: isLoading && !data, isError: error, mutate }
}
