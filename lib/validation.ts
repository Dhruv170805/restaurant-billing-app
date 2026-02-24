// ── Centralized Validation & Sanitization ─────────────
// Pure functions — no database or server-only imports.

import { ValidationError } from './errors'

// ── String helpers ────────────────────────────────────

/** Trim whitespace and strip control characters */
export function sanitizeString(val: unknown): string {
  if (typeof val !== 'string') {
    throw new ValidationError('Expected a string value')
  }
  // Remove control chars (except newline/tab), then trim
  return val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
}

/** Validate a string has length within [min, max] after sanitization */
export function validateStringLength(
  val: unknown,
  fieldName: string,
  min: number = 1,
  max: number = 255
): string {
  const clean = sanitizeString(val)
  if (clean.length < min) {
    throw new ValidationError(`${fieldName} must be at least ${min} character(s)`, {
      field: fieldName,
      min,
    })
  }
  if (clean.length > max) {
    throw new ValidationError(`${fieldName} must be at most ${max} characters`, {
      field: fieldName,
      max,
    })
  }
  return clean
}

/** Validate optional string length */
export function validateOptionalStringLength(
  val: unknown,
  fieldName: string,
  min: number = 0,
  max: number = 255
): string | undefined {
  if (val === undefined || val === null || val === '') return undefined
  return validateStringLength(val, fieldName, min, max)
}

// ── Number helpers ────────────────────────────────────

/** Validate a value is a positive finite number */
export function validatePositiveNumber(val: unknown, fieldName: string): number {
  if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number`, {
      field: fieldName,
      received: val,
    })
  }
  return val
}

/** Validate a value is a positive integer */
export function validatePositiveInteger(val: unknown, fieldName: string): number {
  if (typeof val !== 'number' || !Number.isInteger(val) || val <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer`, {
      field: fieldName,
      received: val,
    })
  }
  return val
}

/** Validate a value is within [min, max] */
export function validateRange(val: unknown, fieldName: string, min: number, max: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    throw new ValidationError(`${fieldName} must be a number`, { field: fieldName })
  }
  if (val < min || val > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`, {
      field: fieldName,
      min,
      max,
      received: val,
    })
  }
  return val
}

// ── Enum helpers ──────────────────────────────────────

/** Validate a value is one of the allowed options */
export function validateEnum<T extends string>(
  val: unknown,
  allowed: readonly T[],
  fieldName: string
): T {
  if (!allowed.includes(val as T)) {
    throw new ValidationError(`${fieldName} must be one of: ${allowed.join(', ')}`, {
      field: fieldName,
      allowed,
      received: val,
    })
  }
  return val as T
}

// ── Settings validation ───────────────────────────────

const VALID_SETTING_KEYS = new Set([
  'restaurantName',
  'restaurantAddress',
  'restaurantPhone',
  'restaurantTagline',
  'currencySymbol',
  'currencyCode',
  'currencyLocale',
  'taxEnabled',
  'taxRate',
  'taxLabel',
  'tableCount',
])

const KNOWN_CURRENCY_CODES = new Set([
  'INR',
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'AUD',
  'CAD',
  'CHF',
  'CNY',
  'SEK',
  'NZD',
  'MXN',
  'SGD',
  'HKD',
  'NOK',
  'KRW',
  'TRY',
  'RUB',
  'BRL',
  'ZAR',
  'TWD',
  'DKK',
  'PLN',
  'THB',
  'IDR',
  'MYR',
  'PHP',
  'AED',
  'SAR',
  'BDT',
  'PKR',
  'LKR',
  'NPR',
])

export function validateSettingsUpdate(body: Record<string, unknown>): Record<string, unknown> {
  const validated: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(body)) {
    if (!VALID_SETTING_KEYS.has(key)) {
      throw new ValidationError(`Unknown setting key: ${key}`, { key })
    }

    switch (key) {
      case 'restaurantName':
        validated[key] = validateStringLength(value, 'Restaurant name', 1, 100)
        break
      case 'restaurantAddress':
      case 'restaurantPhone':
      case 'restaurantTagline':
        validated[key] = validateStringLength(value, key, 0, 200)
        break
      case 'currencySymbol':
        validated[key] = validateStringLength(value, 'Currency symbol', 1, 5)
        break
      case 'currencyCode':
        if (typeof value !== 'string' || !KNOWN_CURRENCY_CODES.has(value.toUpperCase())) {
          throw new ValidationError(`Invalid currency code: ${value}`, { field: key })
        }
        validated[key] = value.toUpperCase()
        break
      case 'currencyLocale':
        validated[key] = validateStringLength(value, 'Locale', 2, 10)
        break
      case 'taxEnabled':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          throw new ValidationError('taxEnabled must be a boolean', { field: key })
        }
        validated[key] = typeof value === 'boolean' ? value : value === 'true'
        break
      case 'taxRate':
        validated[key] = validateRange(
          typeof value === 'string' ? parseFloat(value) : value,
          'Tax rate',
          0,
          1
        )
        break
      case 'taxLabel':
        validated[key] = validateStringLength(value, 'Tax label', 1, 20)
        break
      case 'tableCount':
        validated[key] = validateRange(
          typeof value === 'string' ? parseInt(value) : value,
          'Table count',
          1,
          100
        )
        break
    }
  }

  return validated
}

// ── Order status transitions ──────────────────────────

const VALID_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING: ['PAID', 'UNPAID', 'CANCELLED'],
  UNPAID: ['PAID', 'CANCELLED'],
  PAID: [], // terminal state
  CANCELLED: [], // terminal state
}

export function validateOrderStatusTransition(currentStatus: string, newStatus: string): void {
  const allowed = VALID_TRANSITIONS[currentStatus]
  if (!allowed) {
    throw new ValidationError(`Unknown current order status: ${currentStatus}`)
  }
  if (!allowed.includes(newStatus)) {
    throw new ValidationError(
      `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.length ? allowed.join(', ') : 'none (terminal state)'}`,
      { currentStatus, newStatus, allowed }
    )
  }
}
