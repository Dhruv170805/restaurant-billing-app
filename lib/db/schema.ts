import { Document } from 'mongodb'

export interface DbCategory extends Document {
    _id: number;
    name: string;
}

export interface DbMenuItem extends Document {
    _id: number;
    name: string;
    price: number;
    categoryId: number;
}

export interface DbOrder extends Document {
    _id: number;
    tableNumber: number | null;
    tokenNumber: number;
    status: 'PENDING' | 'PAID' | 'CANCELLED';
    subtotal: number;
    tax: number;
    total: number;
    createdAt: string;
    updatedAt: string;
    paymentMethod: string | null;
    items: { menuItemId: number; name: string; quantity: number; price: number; }[];
    itemCount: number;
}

export interface DbSettings extends Document {
    _id: string; // typically 'app_settings'
    restaurantName: string;
    restaurantAddress: string;
    restaurantPhone: string;
    restaurantTagline: string;
    currencySymbol: string;
    currencyCode: string;
    currencyLocale: string;
    taxEnabled: boolean;
    taxRate: number;
    taxLabel: string;
    tableCount: number;
}

export interface DbCounter extends Document {
    _id: string;
    seq: number;
}
