import { MetadataRoute } from 'next'
import { getSettingsCompat } from '@/lib/settings'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    // Graceful fallback during build-time if MongoDB is not configured or unreachable
    let name = 'Restaurant' // Default name
    try {
        const settings = await getSettingsCompat()
        name = settings.restaurant.name
    } catch {
        console.warn('⚠️ Could not connect to DB for manifest generation. Using default name.')
    }

    return {
        name: `${name} POS`,
        short_name: name,
        description: `Professional Point of Sale and Billing System for ${name}.`,
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#d97706',
        icons: [
            {
                src: '/logo.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    }
}
