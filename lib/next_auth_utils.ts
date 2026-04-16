import { cookies } from 'next/headers'
import { verifySuperToken } from './super_auth'

/**
 * Next.js-Specific Helper: getSuperAdminSession.
 * Safely extracts and verifies the SuperAdmin session from Next.js server context cookies.
 * This is "server-only" and should not be used in NestJS or standalone workers.
 */
export async function getSuperAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('super_token')?.value
  if (!token) return null
  try {
    return await verifySuperToken(token)
  } catch {
    return null
  }
}
