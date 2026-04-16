import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

export function createClient() {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: (times) => {
      // Stop retrying after 3 attempts to prevent log spam if Redis is permanently unreachable
      if (times > 3) return null;
      return Math.min(times * 1000, 3000);
    }
  })

  // Prevent multiple redundant error logs
  client.on('error', (err: Error) => {
    if (err.message.includes('ECONNREFUSED')) return; // Silenced via retry logic instead
    console.error('❌ Redis error:', err.message)
  })

  client.on('connect', () => {
    console.log('✅ Redis connected:', REDIS_URL)
  })

  // Connect lazily
  client.connect().catch(() => {
    console.warn('⚠️  Redis not available — cache features disabled')
  })

  return client
}
