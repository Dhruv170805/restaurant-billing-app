import { MongoClient, Db } from 'mongodb'
import { initializeSchema } from './init'

// The MongoDB connection string
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_db'

const globalForMongo = globalThis as unknown as {
  mongoClient: MongoClient | undefined
}

async function getClient(): Promise<MongoClient> {
  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = new MongoClient(uri)
    await globalForMongo.mongoClient.connect()
  }
  return globalForMongo.mongoClient
}

async function getDb(): Promise<Db> {
  const client = await getClient()
  return client.db() // Uses the database name specified in the URI
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
