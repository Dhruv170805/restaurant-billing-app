
import { getDb } from './mongo'
import { DbUser, DbUserRefreshToken } from './schema'
import { ObjectId } from 'mongodb'

// ── Read ────────────────────────────────────────────────────────────────────

export async function getUserByEmail(tenantId: string, email: string): Promise<DbUser | null> {
  const db = await getDb()
  return db
    .collection<DbUser>('users')
    .findOne({ tenantId, email: email.toLowerCase().trim() })
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const db = await getDb()
  return db.collection<DbUser>('users').findOne({ _id: id })
}

export async function listUsersByTenant(tenantId: string): Promise<DbUser[]> {
  const db = await getDb()
  return db
    .collection<DbUser>('users')
    .find({ tenantId }, { projection: { passwordHash: 0, refreshTokens: 0, totpSecret: 0 } })
    .toArray()
}

export async function countUsers(): Promise<number> {
  const db = await getDb()
  return db.collection<DbUser>('users').countDocuments()
}

// ── Write ────────────────────────────────────────────────────────────────────

export async function createUser(data: {
  tenantId: string
  email: string
  passwordHash: string
  name: string
  roles: DbUser['roles']
}): Promise<DbUser> {
  const db = await getDb()
  const now = new Date().toISOString()
  const user: DbUser = {
    _id: new ObjectId().toHexString(),
    tenantId: data.tenantId,
    email: data.email.toLowerCase().trim(),
    passwordHash: data.passwordHash,
    name: data.name,
    roles: data.roles,
    refreshTokens: [],
    totpEnabled: false,
    emailVerified: false,
    verificationToken: new ObjectId().toHexString(),
    createdAt: now,
    updatedAt: now,
  }
  await db.collection<DbUser>('users').insertOne(user)
  return user
}

export async function updateUserRefreshToken(
  userId: string,
  tokenEntry: DbUserRefreshToken
): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  // Keep max 5 active sessions per user
  const user = await db.collection<DbUser>('users').findOne({ _id: userId })
  const tokens = (user?.refreshTokens ?? []).slice(-4) // keep last 4, add 1 new = 5 max
  tokens.push(tokenEntry)
  await db.collection<DbUser>('users').updateOne(
    { _id: userId },
    { $set: { refreshTokens: tokens, updatedAt: now } }
  )
}

export async function revokeUserRefreshToken(userId: string, tokenHash: string): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.collection('users') as any).updateOne(
    { _id: userId },
    {
      $pull: { refreshTokens: { hash: tokenHash } },
      $set: { updatedAt: now },
    }
  )
}

export async function setUserTotpSecret(userId: string, secret: string): Promise<void> {
  const db = await getDb()
  await db
    .collection<DbUser>('users')
    .updateOne({ _id: userId }, { $set: { totpSecret: secret, totpEnabled: true } })
}

export async function verifyUserEmail(token: string): Promise<DbUser | null> {
  const db = await getDb()
  const user = await db.collection<DbUser>('users').findOne({ verificationToken: token })
  if (!user) return null
  await db.collection<DbUser>('users').updateOne(
    { _id: user._id },
    { $set: { emailVerified: true }, $unset: { verificationToken: '' } }
  )
  return user
}

export async function setResetToken(email: string, token: string, expiresAt: string): Promise<void> {
  const db = await getDb()
  await db
    .collection<DbUser>('users')
    .updateOne({ email: email.toLowerCase() }, { $set: { resetToken: token, resetTokenExpiresAt: expiresAt } })
}

export async function changePassword(userId: string, newPasswordHash: string): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  await db.collection<DbUser>('users').updateOne(
    { _id: userId },
    {
      $set: { passwordHash: newPasswordHash, updatedAt: now },
      $unset: { resetToken: '', resetTokenExpiresAt: '' },
    }
  )
}
