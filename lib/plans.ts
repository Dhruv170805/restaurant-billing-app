// ── Subscription Plan Definitions ─────────────────────────────────────────────
// 100% FOSS — no Stripe, plan upgrades are manual (superadmin confirms payment)

export type PlanId = 'free' | 'starter' | 'pro'

export interface PlanFeatures {
  maxTables: number
  maxMenuItems: number
  analytics: boolean
  gstInvoice: boolean
  offline: boolean
  marketing: boolean   // WhatsApp / SMS marketing tab
  kds: boolean         // Kitchen Display System
  multiUser: boolean   // Multiple cashier accounts
  exportData: boolean  // CSV/PDF exports
  customDomain: boolean
  prioritySupport: boolean
}

export const PLANS: Record<PlanId, { name: string; features: PlanFeatures }> = {
  free: {
    name: 'Free',
    features: {
      maxTables: 5,
      maxMenuItems: 50,
      analytics: false,
      gstInvoice: false,
      offline: false,
      marketing: false,
      kds: false,
      multiUser: false,
      exportData: false,
      customDomain: false,
      prioritySupport: false,
    },
  },
  starter: {
    name: 'Starter',
    features: {
      maxTables: 20,
      maxMenuItems: 200,
      analytics: true,
      gstInvoice: false,
      offline: true,
      marketing: true,
      kds: true,
      multiUser: false,
      exportData: true,
      customDomain: false,
      prioritySupport: false,
    },
  },
  pro: {
    name: 'Pro',
    features: {
      maxTables: 9999,
      maxMenuItems: 9999,
      analytics: true,
      gstInvoice: true,
      offline: true,
      marketing: true,
      kds: true,
      multiUser: true,
      exportData: true,
      customDomain: true,
      prioritySupport: true,
    },
  },
}

export function getPlanFeatures(planId: PlanId): PlanFeatures {
  return PLANS[planId]?.features ?? PLANS.free.features
}

export function hasFeature(planId: PlanId, feature: keyof PlanFeatures): boolean {
  return !!getPlanFeatures(planId)[feature]
}

export function isWithinLimit(
  planId: PlanId,
  limit: 'maxTables' | 'maxMenuItems',
  currentCount: number
): boolean {
  const max = getPlanFeatures(planId)[limit] as number
  return currentCount < max
}
