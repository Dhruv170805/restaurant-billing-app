/**
 * NEXUS PLATFORM CONFIGURATION: Operational Constants.
 * Centralized authority for SaaS defaults, security timeouts, and multi-tenant routing.
 */

export const PLATFORM_CONFIG = {
  // Brand
  NAME: 'NEXUS POS',
  OWNER: 'Dhruv Patel',
  
  // Domains (Local Development Defaults)
  CORE_DOMAIN: 'nexuspos.local',
  HQ_SUBDOMAIN: 'hq',
  
  // Billing & Lifecycle
  SUBSCRIPTION_GRACE_PERIOD_DAYS: 7,
  AUDIT_RETENTION_DAYS: 365,
  
  // Auth Security
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '30d',
  SUPER_SESSION_TTL: '1h',
  IMPERSONATION_TTL: '30m',
  
  // Offline Engine
  SYNC_RETRY_LIMIT: 5,
  SYNC_BATCH_SIZE: 50,
};
