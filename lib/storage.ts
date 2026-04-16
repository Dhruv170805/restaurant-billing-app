
import { Client as MinioClient, type BucketItem } from 'minio'

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost'
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000', 10)
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true'
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin'
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin'
const DEFAULT_BUCKET = process.env.MINIO_BUCKET || 'restaurant-saas'

// ── Singleton client ──────────────────────────────────────────────────────────

let _minio: MinioClient | null = null

function getMinioClient(): MinioClient {
  if (_minio) return _minio
  _minio = new MinioClient({
    endPoint: MINIO_ENDPOINT,
    port: MINIO_PORT,
    useSSL: MINIO_USE_SSL,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
  })
  return _minio
}

// ── Ensure bucket exists ──────────────────────────────────────────────────────

const _initializedBuckets = new Set<string>()

async function ensureBucket(bucket: string): Promise<void> {
  if (_initializedBuckets.has(bucket)) return
  const client = getMinioClient()
  try {
    const exists = await client.bucketExists(bucket)
    if (!exists) {
      await client.makeBucket(bucket)
      console.log(`✅ MinIO bucket created: ${bucket}`)
    }
    _initializedBuckets.add(bucket)
  } catch (err) {
    console.warn(`⚠️  MinIO bucket check failed for "${bucket}":`, (err as Error).message)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upload a file buffer to MinIO.
 * @returns public object key (not URL — use getSignedUrl for access)
 */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string,
  bucket = DEFAULT_BUCKET
): Promise<string> {
  await ensureBucket(bucket)
  const client = getMinioClient()
  await client.putObject(bucket, key, buffer, buffer.length, { 'Content-Type': contentType })
  return key
}

/**
 * Generate a pre-signed GET URL (default 1 hour expiry).
 */
export async function getSignedUrl(
  key: string,
  expirySeconds = 3600,
  bucket = DEFAULT_BUCKET
): Promise<string> {
  const client = getMinioClient()
  return client.presignedGetObject(bucket, key, expirySeconds)
}

/**
 * Delete an object from MinIO.
 */
export async function deleteFile(key: string, bucket = DEFAULT_BUCKET): Promise<void> {
  const client = getMinioClient()
  await client.removeObject(bucket, key)
}

/**
 * Stream an object — returns a readable stream.
 */
export async function getFileStream(
  key: string,
  bucket = DEFAULT_BUCKET
): Promise<NodeJS.ReadableStream> {
  const client = getMinioClient()
  return client.getObject(bucket, key)
}

/**
 * Check if a file exists in MinIO.
 */
export async function fileExists(key: string, bucket = DEFAULT_BUCKET): Promise<boolean> {
  const client = getMinioClient()
  try {
    await client.statObject(bucket, key)
    return true
  } catch {
    return false
  }
}

// ── Key helpers ───────────────────────────────────────────────────────────────

export const storageKeys = {
  logo: (tenantId: string, ext = 'png') => `logos/${tenantId}/logo.${ext}`,
  invoice: (tenantId: string, orderId: number) => `invoices/${tenantId}/${orderId}.pdf`,
  report: (tenantId: string, filename: string) => `reports/${tenantId}/${filename}`,
  export: (tenantId: string, filename: string) => `exports/${tenantId}/${filename}`,
}
