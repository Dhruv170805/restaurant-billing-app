-- ── SuperAdmin Command Plane (Control Plane Schema) ──────────────────────────
-- Engineered for NEXUS POS: Operational Control for the Platform Owner

-- 1. SuperAdmins Table: The Controllers
CREATE TABLE super_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(32) DEFAULT 'SUPPORT' CHECK (role IN ('OWNER', 'FINANCE', 'SUPPORT')),
    totp_secret TEXT,
    totp_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SaaS Plans: Global Tiers
CREATE TABLE plans (
    id VARCHAR(32) PRIMARY KEY, -- e.g. 'FREE', 'STARTER', 'PRO'
    name VARCHAR(128) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    interval VARCHAR(16) DEFAULT 'MONTHLY' CHECK (interval IN ('MONTHLY', 'YEARLY')),
    features JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Subscriptions: Multi-Tenant Lifecycle
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id VARCHAR(32) NOT NULL REFERENCES plans(id),
    status VARCHAR(32) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'GRACE_PERIOD', 'SUSPENDED')),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_expiry ON subscriptions(current_period_end);

-- 4. Payment Requests: Manual UPI Verification Workflow
CREATE TABLE payment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    plan_id VARCHAR(32) NOT NULL REFERENCES plans(id),
    amount DECIMAL(10, 2) NOT NULL,
    transaction_id VARCHAR(128) UNIQUE NOT NULL, -- UPI/Ref Number
    status VARCHAR(32) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    notes TEXT,
    verified_by UUID REFERENCES super_admins(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Global Audit Logs: Immutable Command History
CREATE TABLE platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES super_admins(id),
    type VARCHAR(64) NOT NULL, -- e.g. 'SUSPEND_TENANT', 'APPROVE_PAYMENT'
    tenant_id UUID,
    payload JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial Data
INSERT INTO plans (id, name, price, features) VALUES 
('FREE', 'Free Tier', 0.00, '{"max_orders": 100, "analytics": false}'),
('STARTER', 'Restaurant Starter', 999.00, '{"max_orders": 1000, "analytics": true, "whatsapp": true}'),
('PRO', 'Fine Dining Pro', 2499.00, '{"max_orders": 10000, "analytics": true, "whatsapp": true, "kds": true}');
