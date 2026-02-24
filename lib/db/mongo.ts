import { MongoClient } from 'mongodb'
import { initializeSchema } from './init'
import type { Db } from 'mongodb'

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_db'

const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (!process.env.MONGODB_URI) {
  console.warn('Please add your Mongo URI to .env.local')
}

// In development mode, use a global variable so that the value
// is preserved across module reloads caused by HMR (Hot Module Replacement).
if (process.env.NODE_ENV === 'development') {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export async function getDb(): Promise<Db> {
  const connectedClient = await clientPromise
  return connectedClient.db()
}

let _initialized = false

export async function ensureInitialized(): Promise<Db> {
  const db = await getDb()
  if (!_initialized) {
    await initializeSchema(db)
    _initialized = true
  }
  return db
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
