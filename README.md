# 🚀 NEXUS POS: Enterprise Restaurant Engine

## High-Performance, Real-Time Billing & Operations Ecosystem

[![Tech Stack](https://img.shields.io/badge/Stack-Next.js%20|%20Node.js%20|%20Flutter-blue.svg)](https://img.shields.io/badge/Stack-Next.js%20|%20Node.js%20|%20Flutter-blue.svg)
[![Engineered for Performance](https://img.shields.io/badge/Engineered-Low--End%20Device%20Optimized-orange.svg)](https://img.shields.io/badge/Engineered-Low--End%20Device%20Optimized-orange.svg)

Nexus POS is not just a billing app; it's a **distributed real-time ecosystem** designed to operate at scale on consumer-grade hardware. Built with a focus on **0ms-perceived latency**, it bridges the gap between sophisticated cloud analytics and rugged, low-cost restaurant floor operations.

---

## 🏛️ Architecture Overview

The system follows a **Reactive Event-Driven Architecture (REDA)**, ensuring that state transitions (Order Placement → KDS Notification → Payment Completion) are synchronized across all nodes in the network within milliseconds.

### 1. Hybrid Web Gateway (Next.js + Socket.io)
- **Aggregated Analytics**: Uses MongoDB `$facet` pipelines to deliver complex revenue insights in a single RTT.
- **WebSocket Gateway**: A low-level Node.js gateway handles persistent duplex connections, replacing legacy polling with an "Instant-Push" model.
- **Theme-Engine**: Server-side rendering (SSR) of theme preferences with instant client-side hydration for a zero-flicker experience.

### 2. Native Mobile Front-End (Flutter)
- **GPU-Aware Rendering**: Utilizes `RepaintBoundary` to isolate high-frequency UI updates (e.g., cart quantity adjustments), ensuring 60fps on devices with limited CPUs (₹6,000–₹10,000 range).
- **Granular State Management**: Leveraging `Selector` patterns to minimize widget rebuild cycles, critical for low-RAM stability.
- **Connection Pooling**: Implements a persistent HTTP client singleton with keep-alive headers to reduce TCP handshake overhead.

---

## 🔥 Key Engineering Features

- **Multi-Device Sync**: Real-time state propagation via `Socket.io-client`. When a waiter adds an item, the kitchen tablet rings instantly.
- **Professional Billing Engine**: Native 80mm thermal print support with custom-authored PDF graphics, designed for high-throughput environments.
- **WhatsApp Marketing CRM**: Deep-integrated customer reminder system using intent-based deep-linking for professional debt recovery and post-sale engagement.
- **SRE Resilience**: Includes a comprehensive [SRE Runbook](./SRE_RUNBOOK.md) for disaster recovery and operational monitoring.

---

## 🛠️ Infrastructure Setup

### Web / API Engine
1. **Environment Config**:
   Create a `.env.local` at the root:
   ```env
   MONGODB_URI=mongodb+srv://...
   ```
2. **Boot Sequence**:
   ```bash
   npm install && npm run dev
   ```
   *The system will initialize the custom `server.js` gateway on port 3000.*

### Mobile Fleet
1. **Dependency Sync**:
   ```bash
   cd mobile && flutter pub get
   ```
2. **Network Handshake**:
   - Ensure the mobile fleet is on the same subnet as the Web Gateway.
   - Navigate to **Settings** in the app and input the Server's local IP (e.g., `192.168.1.5`).

---

## 📈 Performance Benchmarks (Simulated)
- **API Response Time**: < 120ms (P95)
- **WebSocket Latency**: < 50ms
- **UI Render Time**: < 16ms (consistent 60fps) on Unisoc T606/T610 chipsets.

---

## 📜 Dev Manifesto
This project adheres to the principle of **"Mechanical Sympathy"**—writing software that works *with* the underlying hardware rather than fighting it. Every byte of memory and CPU cycle counts in a busy kitchen.

**Nexus POS — Built for the Grind.**
