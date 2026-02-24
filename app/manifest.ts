import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Shreeji Restaurant POS',
        short_name: 'Shreeji',
        description: 'Professional Point of Sale and Billing System for Shreeji Restaurant.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#d97706',
        icons: [
            {
                src: '/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    }
}
