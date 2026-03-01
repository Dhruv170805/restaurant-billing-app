# Site Reliability Engineering (SRE) Runbook

**Restaurant Billing & POS System**

This document serves as the operational runbook for deploying, monitoring, backing up, and troubleshooting the production Restaurant Billing application across Web and Mobile.

---

## 1. Architecture Overview

- **Web Application**: Next.js 15 (App Router). Built as a `standalone` Node.js server.
- **Mobile Application**: Native Flutter App (Android/iOS).
- **Database Layer**: MongoDB (Atlas or Container). Uses official `mongodb` driver with lazy-singleton connection pooling.
- **Hosting Strategy**: Docker Compose for Web & DB. Mobile requires APK/IPA distribution.

## 2. Production Deployment

### Web App (Docker)

To deploy or update the latest `main` branch:

```bash
git pull origin main
docker-compose up -d --build
```

### Mobile App (Flutter)

To build the production Android app:

```bash
cd mobile
flutter build apk --release
```

The resulting file will be at `mobile/build/app/outputs/flutter-apk/app-release.apk`.

## 3. Database Backups & Disaster Recovery (MongoDB)

### Automated / Manual Backups (mongodump)

To safely backup the database from a running MongoDB container:

```bash
docker exec $(docker-compose ps -q db) mongodump --uri="mongodb://localhost:27017/restaurant_db" --archive > backup_$(date +%F).archive
```

### Restoring from Backup

To restore the database from an archive:

```bash
cat backup.archive | docker exec -i $(docker-compose ps -q db) mongorestore --archive
```

## 4. Monitoring & Alerting

### Health Checks

The application relies on `/api/health` returning `200 OK`. Set up an external Uptime monitor pointing to:
`http://YOUR_SERVER_IP:3000/api/health`

### Inspecting Logs

- **Application Logs**: `docker-compose logs --tail=100 -f web`
- **Database Logs**: `docker-compose logs --tail=100 -f db`

## 5. Known Troubleshooting Scenarios

### 🔴 Symptom: Mobile App "TimeoutException"

**Cause**: The phone cannot reach the computer's local IP on the network.
**Resolution**:
1. Ensure both devices are on the same Wi-Fi.
2. Check your Mac/PC local IP (e.g., `192.168.x.x`).
3. Open the **Settings** tab in the mobile app and update the **Server IP** field.

### 🔴 Symptom: MongoDB Connection Failed

**Cause**: `MONGODB_URI` in `.env.local` is incorrect or the database container is down.
**Resolution**:
1. Verify the connection string in `.env.local`.
2. check container status: `docker-compose ps`.
3. Check network connectivity to MongoDB Atlas if using cloud hosting.

### 🔴 Symptom: App crashes on "Port 3000 is already in use"

**Cause**: Another process is blocking the port.
**Resolution**:
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
docker-compose up -d
```

## 6. Capacity & Scaling

- **Vertical Scaling**: Upgrade host RAM/CPU for higher concurrency.
- **Horizontal Scaling**: Next.js is stateless and supports multiple replicas. MongoDB handles scaling via Shards/Replica Sets.
