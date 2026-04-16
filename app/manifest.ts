import { MetadataRoute } from 'next'
import { getTenantBySlug } from '@/lib/db/tenants'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    // Graceful fallback during build-time if MongoDB is not configured or unreachable
    const defaultData = { name: 'NEXUS POS', theme: '#f37c22' }
    try {
        const tenant = await getTenantBySlug('default')
        if (tenant) {
            defaultData.name = tenant.name
            defaultData.theme = tenant.theme.primary
        }
    } catch (e) {
        // Ignore db errors during next build phase
    }

    return {
        name: defaultData.name,
        short_name: defaultData.name,
        description: 'Multi-Tenant Restaurant POS System',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: defaultData.theme,
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
