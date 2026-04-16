import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  output: 'standalone',
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  async rewrites() {
    return [
      {
        source: '/hq/api/superadmin/:path*',
        destination: 'http://localhost:4000/api/superadmin/:path*',
      },
    ]
  },
}

export default nextConfig
