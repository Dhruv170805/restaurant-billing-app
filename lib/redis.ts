
import { createClient } from './redis-client'

// Re-export for convenience
export { createClient }

// ── Singleton Redis client (server-side only) ─────────────────────────────────

let _client: ReturnType<typeof createClient> | null = null

export function getRedis() {
  if (_client) return _client

  const g = global as typeof globalThis & { _redis?: ReturnType<typeof createClient> }

  if (process.env.NODE_ENV === 'development') {
    if (!g._redis) {
      g._redis = createClient()
    }
    _client = g._redis
  } else {
    _client = createClient()
  }

  return _client
}

export async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  const val = await redis.get(key)
  if (!val) return null
  try {
    return JSON.parse(val) as T
  } catch {
    return null
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedis()
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
}

export async function delCache(key: string): Promise<void> {
  const redis = getRedis()
  await redis.del(key)
}
