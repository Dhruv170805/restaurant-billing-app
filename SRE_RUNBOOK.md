# 🛡️ Site Reliability Engineering (SRE) Runbook

## High-Availability Operations Guide — Nexus POS Ecosystem

This document defines the operational standards and disaster recovery protocols for the Nexus POS environment. Our goal is to ensure **99.9% availability** of core billing services during peak restaurant floor hours.

---

## 🏛️ 1. Infrastructure Architecture

The system is a distributed hybrid architecture:
- **Global Edge**: Next.js 15 App Router deployed on Vercel.
- **Real-time Gateway**: Node.js WebSocket engine (Socket.io).
- **Data Persistence**: MongoDB Atlas Cluster (sharded with replica sets).
- **Edge Client**: Native Flutter mobile fleet (iOS/Android).

---

## 💾 2. Data Persistence & Lifecycle

### 2.1 7-Day Auto-Purge (TTL) Strategy
To maintain O(1) performance in a high-throughput kitchen, Nexus POS implements a **partial TTL (Time-To-Live) index** for data pruning. This keeps the active data set small and fast while ensuring historical records are archived or deleted.

```javascript
// lib/db/init.ts - TTL implementation
db.collection('orders').createIndex(
  { createdAt: 1 },
  {
    expireAfterSeconds: 7 * 24 * 60 * 60, // 7 days
    partialFilterExpression: { status: 'PAID' },
    name: 'ttl_paid_orders_7_days'
  }
);
```

### 2.2 Manual Backups (mongodump)
```bash
# Production Cluster Snapshot
mongodump --uri="mongodb+srv://<user>:<pwd>@cluster0.abc.mongodb.net/restaurant_db" --archive > full_backup_$(date +%F).archive
```

---

## 🆘 3. Global Incident Response Matrix

| Symptom | Severity | Potential Cause | Resolution |
| :--- | :--- | :--- | :--- |
| **Mobile Timeout** | High | Network jitter or missing HTTP prefix | 1. Verify `API_BASE_URL` in `.env`. 2. Check corporate firewall whitelisting. |
| **DB Connection Error** | Critical | Atlas IP whitelist block | 1. Whitelist Vercel outbound IPs in Atlas. 2. Verify `MONGODB_URI` string. |
| **WebSocket Failure** | Medium | Load balancer connection termination | 1. Ensure `transports: ['websocket']` is enforced. 2. Verify Vercel WebSocket limit. |

---

## 📊 4. Monitoring & SLOs

- **Availability**: 99.9% target. Point monitors to `PROD_URL/api/health`.
- **P95 Latency**: < 120ms for complex order placements.
- **Sync Jitter**: < 20ms for WebSocket state propagation.

---

## 🔒 5. Environmental Security Checklist

| Variable | Priority | Description |
| :--- | :--- | :--- |
| `MONGODB_URI` | Critical | Primary connection string for Atlas cluster. |
| `NODE_ENV` | High | Set to `production` in Vercel to enable edge optimizations. |
| `OWNER_PHONE` | High | WhatsApp Business number for CRM deep-linking. |
| `API_BASE_URL` | Critical | (Mobile) Target for the Flutter network layer. |

---

## 🚀 6. Scalability Matrix

- **Vertical**: Managed by Vercel Serverless (auto-scaling compute).
- **Horizontal**: MongoDB Atlas handles sharding and scaling on demand.
- **Edge**: Next.js 15 uses Partial Prerendering (PPR) for maximum responsiveness.

**Nexus POS — Stability is Efficiency.**
