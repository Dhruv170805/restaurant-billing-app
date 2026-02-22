# Site Reliability Engineering (SRE) Runbook
**Restaurant Billing & POS System**

This document serves as the operational runbook for deploying, monitoring, backing up, and troubleshooting the production Restaurant Billing application.

---

## 1. Architecture Overview
- **Application App**: Next.js 15 (App Router). Built via Docker as a `standalone` Node.js server.
- **Database Layer**: MySQL 8.0 container. Uses `mysql2/promise` with a global connection pool.
- **Hosting Strategy**: Docker Compose (single node deployment). Can be easily moved to Kubernetes or ECS.

## 2. Production Deployment
The application is fully containerized. A standard deployment triggers a rebuild of the Next.js standalone container.

### Step 1: Deploy / Update
To deploy the latest `main` branch:
```bash
git pull origin main
docker-compose up -d --build
```

### Step 2: Zero-Downtime Verification
Check the web container logs to ensure Next.js is "Ready":
```bash
docker-compose logs -f web
```

## 3. Database Backups & Disaster Recovery

### Automated / Manual Backups (mysqldump)
To safely backup the database from the running MySQL container without shutting down the app:
```bash
docker exec $(docker-compose ps -q db) /usr/bin/mysqldump -u root -pmy-secret-pw restaurant_billing > backup_$(date +%F).sql
```
*Note: Schedule the above command via `cron` to run nightly.*

### Restoring from Backup
If the database drops or gets corrupted, restore the `backup.sql`:
```bash
cat backup.sql | docker exec -i $(docker-compose ps -q db) /usr/bin/mysql -u root -pmy-secret-pw restaurant_billing
```

## 4. Monitoring & Alerting

### Health Checks
The application relies on `/api/settings` and `/api/dashboard` returning `200 OK`. Set up an external Uptime monitor (e.g., UptimeRobot, Datadog, Pingdom) pointing to:
`http://YOUR_SERVER_IP:3000/`

### Inspecting Logs
- **Application Logs:** `docker-compose logs --tail=100 -f web` (Look for `TypeError` or React Hydration exceptions).
- **Database Logs:** `docker-compose logs --tail=100 -f db` (Look for `Too many connections` or `Access denied`).

## 5. Known Troubleshooting Scenarios

### 🔴 Symptom: "Too many connections" Error
**Cause:** Next.js development HMR (Hot Module Replacement) flooded MySQL, or the production pool size (10) is exhausted by high traffic.
**Resolution:** 
1. The global cache specifically handles HMR in Dev. 
2. If this occurs in Production, increase `connectionLimit` in `lib/db.ts` to `50` and restart the containers:
```bash
docker-compose restart web
```

### 🔴 Symptom: App crashes on "Port 3000 is already in use"
**Cause:** Another node process (like a local `npm run dev`) or container is blocking the port.
**Resolution:**
Kill the dangling process:
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
docker-compose up -d
```

### 🔴 Symptom: Database data is missing after restart
**Cause:** The Docker Volume `db_data` was pruned or not mapped correctly.
**Resolution:** Verify that `volumes: - db_data:/var/lib/mysql` is actively linked in `docker-compose.yml`. Never run `docker-compose down -v` unless you intentionally want to format the database.

## 6. Capacity & Scaling
- **Vertical Scaling**: For heavy loads (>50 active staff tablets), upgrade the underlying Host Server RAM. Allocate more memory configured via Docker.
- **Horizontal Scaling**: If running multiple `web` replicas, Next.js handles it natively since sessions are stateless. However, the exact MySQL `db` connection limits must be increased significantly.
