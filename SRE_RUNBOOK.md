# Site Reliability Engineering (SRE) Runbook

**Restaurant Billing & POS System**

This document serves as the operational runbook for deploying, monitoring, backing up, and troubleshooting the production Restaurant Billing application across Web and Mobile.

---

## 1. Architecture Overview

- **Web Application**: Next.js 15 (App Router). Deployed on Vercel Serverless Edge.
- **Mobile Application**: Native Flutter App (Android/iOS).
- **Database Layer**: MongoDB Atlas Cloud Cluster.
- **Hosting Strategy**: Vercel for Web API. Mobile requires APK/IPA distribution.

## 2. Production Deployment

### Web App (Vercel)

Next.js functions are mapped to Vercel Serverless compute. Pushing to the `main` GitHub branch triggers automatic rolling deployments via Vercel CI/CD.

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
`https://restaurant-billing-app-self.vercel.app/api/health`

### Inspecting Logs

- **Application Logs**: Accessible inside the Vercel Dashboard -> Logs tab.
- **Database Logs**: Accessible inside MongoDB Atlas.

### 🔴 Symptom: Mobile App "TimeoutException"

**Cause**: The phone cannot reach the Vercel edge runtime, or the `.env` variable is missing HTTP strings.
**Resolution**:
1. Check device cellular/Wi-Fi connection.
2. Verify `API_BASE_URL` in `/mobile/.env` is strictly configured to the `.vercel.app` domain.

### 🔴 Symptom: MongoDB Connection Failed

**Cause**: `MONGODB_URI` environment variable is incorrect or the IP address hasn't been allowed in MongoDB Atlas.
**Resolution**:
1. Verify the connection string in the Vercel Dashboard Settings.
2. Check network connectivity and ensure Vercel outbound IPs are whitelisted in MongoDB Atlas.

- **Vertical Scaling**: Managed automatically by Vercel Edge compute.
- **Horizontal Scaling**: Next.js is stateless and scales natively to Vercel serverless workers. MongoDB handles scaling via sharded Replica Sets inside Atlas.
