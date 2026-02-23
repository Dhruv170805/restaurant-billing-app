export interface Category {
    id: number
    name: string
    itemCount?: number
}

export interface MenuItem {
    id: number
    name: string
    price: number
    category: { id: number; name: string }
}

export interface AppSettings {
    restaurantName: string
    restaurantAddress: string
    restaurantPhone: string
    restaurantTagline: string
    currencyLocale: string
    currencyCode: string
    currencySymbol: string
    taxEnabled: boolean
    taxRate: number
    taxLabel: string
    tableCount: number
}

export interface OrderItem {
    id?: number
    orderId?: number
    menuItemId: number
    name: string
    quantity: number
    price: number
    menuItem?: {
        name: string
        category: {
            name: string
        }
    }
}

export interface Order {
    id: number
    tableNumber: number | null
    tokenNumber: number
    status: 'PENDING' | 'PAID' | 'CANCELLED'
    subtotal: number
    tax: number
    total: number
    createdAt: string
    updatedAt: string
    paymentMethod: string | null
    items: OrderItem[]
    itemCount?: number
}

export interface TableInfo {
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

export interface DashboardStats {
    todayRevenue: number
    cashRevenue: number
    onlineRevenue: number
    todayOrders: number
    pendingOrders: number
    recentOrders: Order[]
}

export interface PaginatedOrders {
    orders: Order[]
    total: number
    page: number
    limit: number
    totalPages: number
}
