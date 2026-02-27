import { MongoClient } from 'mongodb'
import { initializeSchema } from './init'
import type { Db } from 'mongodb'

if (!process.env.MONGODB_URI) {
  console.warn('⚠️  MONGODB_URI not set in .env.local – falling back to localhost')
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_db'

// ── Lazy singleton connection ────────────────────────────────────────────────
// We do NOT connect at module-load time. Connecting eagerly can cause an
// unhandled-rejection crash before /api/health can respond.
// Instead we connect on first use and cache the promise thereafter.

let _clientPromise: Promise<MongoClient> | null = null

function getClientPromise(): Promise<MongoClient> {
  if (_clientPromise) return _clientPromise

  // In development, persist across HMR reloads via a global.
  if (process.env.NODE_ENV === 'development') {
    const g = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>
    }
    if (!g._mongoClientPromise) {
      g._mongoClientPromise = new MongoClient(uri).connect()
    }
    _clientPromise = g._mongoClientPromise
  } else {
    _clientPromise = new MongoClient(uri).connect()
  }

  return _clientPromise
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise()
  return client.db()
}

let _initialized = false

export async function ensureInitialized(): Promise<Db> {
  try {
    const db = await getDb()
    if (!_initialized) {
      await initializeSchema(db)
      _initialized = true
    }
    return db
  } catch {
    console.warn('⚠️ MongoDB connection failed during initialization. This is expected during build-time without a live DB.')
    throw new Error('Database connection unavailable')
  }
}

// Helper to generate sequential numbers for IDs, since the frontend expects `id` as `number`
export async function getNextSequence(sequenceName: string): Promise<number> {
  const db = await getDb()
  const result = await db
    .collection<{ _id: string; seq: number }>('counters')
    .findOneAndUpdate(
      { _id: sequenceName },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    )
  if (!result) throw new Error('Could not generate sequence')
  return result.seq
}
