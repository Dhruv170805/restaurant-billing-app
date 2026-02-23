import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { TableInfo, AppSettings, MenuItem, Category, Order, DashboardStats } from '@/types'

export function useSettings() {
    const { data, error, mutate } = useSWR<AppSettings>('/api/settings', fetcher)
    return {
        settings: data,
        isLoading: !error && !data,
        isError: error,
        mutate
    }
}

export function useTables() {
    const { data, error, mutate } = useSWR<TableInfo[]>('/api/tables', fetcher, {
        refreshInterval: 10000 // Refresh every 10s for real-time status
    })
    return {
        tables: data || [],
        isLoading: !error && !data,
        isError: error,
        mutate
    }
}

export function useMenu() {
    const { data, error, mutate } = useSWR<MenuItem[]>('/api/menu', fetcher)
    return {
        items: data || [],
        isLoading: !error && !data,
        isError: error,
        mutate
    }
}

export function useCategories() {
    const { data, error, mutate } = useSWR<Category[]>('/api/categories', fetcher)
    return {
        categories: data || [],
        isLoading: !error && !data,
        isError: error,
        mutate
    }
}

export function useOrders() {
    const { data, error, mutate } = useSWR<Order[]>('/api/orders', fetcher)
    return {
        orders: data || [],
        isLoading: !error && !data,
        isError: error,
        mutate
    }
}

export function useDashboard() {
    const { data, error, mutate } = useSWR<DashboardStats>('/api/dashboard', fetcher)
    return {
        stats: data,
        isLoading: !error && !data,
        isError: error,
        mutate
    }
}
