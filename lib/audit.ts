
import { getDb } from './db/mongo'
import { DbAuditLog } from './db/schema'
import { ObjectId } from 'mongodb'

export type AuditEventType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'IMPERSONATE'
  | 'PLAN_CHANGE'
  | 'USER_CREATED'
  | 'USER_DELETED'
  | 'TENANT_SUSPENDED'
  | 'TENANT_REACTIVATED'
  | 'ORDER_DELETED'
  | 'SETTINGS_CHANGED'
  | 'PASSWORD_RESET'
  | 'TOTP_ENABLED'
  | 'TENANT_CREATED'

export async function logAuditEvent(params: {
  type: AuditEventType
  actorId: string
  actorEmail: string
  tenantId: string
  targetId?: string
  payload?: Record<string, unknown>
  ip?: string
}): Promise<void> {
  try {
    const db = await getDb()
    const event: DbAuditLog = {
      _id: new ObjectId().toHexString(),
      type: params.type,
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      tenantId: params.tenantId,
      targetId: params.targetId,
      payload: params.payload,
      ip: params.ip,
      createdAt: new Date().toISOString(),
    }
    await db.collection<DbAuditLog>('audit_logs').insertOne(event)
  } catch {
    // Non-fatal — never crash the request over an audit log failure
    console.error('⚠️  Failed to write audit log:', params.type)
  }
}

export async function getAuditLogs(tenantId?: string, limit = 100): Promise<DbAuditLog[]> {
  const db = await getDb()
  const filter = tenantId ? { tenantId } : {}
  return db
    .collection<DbAuditLog>('audit_logs')
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()
}
