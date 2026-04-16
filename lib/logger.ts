// ── Structured logger (pino) ──────────────────────────────────────────────────
// Outputs JSON in production (→ Promtail → Loki)
// Outputs human-readable in development (pino-pretty)

import pino from 'pino'

const isDev = process.env.NODE_ENV === 'development'

const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {
        // Production: structured JSON
        formatters: {
          level(label) {
            return { level: label }
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
})

// ── Context-bound child loggers ───────────────────────────────────────────────

export function createLogger(context: {
  tenantId?: string
  userId?: string
  requestId?: string
  route?: string
}) {
  return baseLogger.child(context)
}

export const logger = baseLogger
export default baseLogger
