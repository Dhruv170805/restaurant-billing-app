import { SignJWT, jwtVerify, type JWTPayload } from 'jose'


/**
 * SuperAuth Engine: Universal Logic.
 * Environment-agnostic cryptographic signing and verification.
 */

const SUPER_SECRET = new TextEncoder().encode(
  process.env.SUPER_JWT_SECRET || 'platform-hq-top-secret-change-immediately!'
)

export interface SuperTokenPayload extends JWTPayload {
  sub: string          // superAdminId
  role: string
  email: string
  is2faVerified: boolean
}

/**
 * Signs a JWT specifically for the SuperAdmin Control Plane.
 */
export async function signSuperToken(payload: Omit<SuperTokenPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // Short session for owners
    .sign(SUPER_SECRET)
}

/**
 * Verifies a SuperAdmin token.
 */
export async function verifySuperToken(token: string): Promise<SuperTokenPayload> {
  const { payload } = await jwtVerify(token, SUPER_SECRET)
  return payload as SuperTokenPayload
}


