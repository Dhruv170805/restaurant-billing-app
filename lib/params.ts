

/**
 * Safely extract a single string from a Next.js 16 route param.
 * In Next.js 16, catch-all routes yield string[], single params are string.
 * This normalises both to a single string.
 */
export function extractParam(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined
  return Array.isArray(v) ? v[0] : v
}

/**
 * Extract and parse an integer param.
 * Returns NaN if the param is missing or not a valid integer.
 */
export function extractIntParam(v: string | string[] | undefined): number {
  const s = extractParam(v)
  return s ? parseInt(s, 10) : NaN
}
