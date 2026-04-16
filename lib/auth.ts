// lib/auth.ts - Universal Auth Logic
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import bcrypt from 'bcryptjs'
import { TOTP, Secret } from 'otpauth'

// ── Environment ──────────────────────────────────────────────────────────────

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production-32chars!'
)
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production!'
)

const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL = '30d'

// ── JWT Payload Types ─────────────────────────────────────────────────────────

export interface AccessTokenPayload extends JWTPayload {
  sub: string          // userId
  tenantId: string
  roles: string[]
  email: string
  name: string
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string          // userId
  tenantId: string
}

// ── JWT: Sign ────────────────────────────────────────────────────────────────

export async function signAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(ACCESS_SECRET)
}

export async function signRefreshToken(userId: string, tenantId: string): Promise<string> {
  return new SignJWT({ sub: userId, tenantId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(REFRESH_SECRET)
}

// ── JWT: Verify ───────────────────────────────────────────────────────────────

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET)
  return payload as AccessTokenPayload
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET)
  return payload as RefreshTokenPayload
}

// ── Password ──────────────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

// ── Impersonation token (short-lived, 30 min) ─────────────────────────────────

export async function signImpersonationToken(
  actorId: string,
  targetTenantId: string,
  targetUserId: string
): Promise<string> {
  return new SignJWT({ sub: targetUserId, tenantId: targetTenantId, impersonatedBy: actorId, roles: ['admin'] })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(ACCESS_SECRET)
}

// ── TOTP ──────────────────────────────────────────────────────────────────────

export function generateTotpSecret(label: string, issuer = 'NEXUS POS'): { secret: string; uri: string } {
  const totp = new TOTP({
    issuer,
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new Secret(),
  })
  return {
    secret: totp.secret.base32,
    uri: totp.toString(), // otpauth:// URI for QR code
  }
}

export function verifyTotp(secret: string, token: string): boolean {
  const totp = new TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  })
  const delta = totp.validate({ token, window: 1 })
  return delta !== null
}

// ── Bcrypt token hashing (for refresh token storage) ─────────────────────────

export async function hashToken(raw: string): Promise<string> {
  return bcrypt.hash(raw, 10)
}

export async function verifyTokenHash(raw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(raw, hash)
}
