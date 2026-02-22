# Restaurant Billing & POS System

A modern, fast, and feature-rich Point of Sale (POS) and billing system designed specifically for restaurants. It features a stunning dark-mode interface, robust table management, and comprehensive order tracking.

## Features

- **Table Management**: Visual grid of all restaurant tables, color-coded based on occupancy.
- **Dynamic POS Flow**: Add items to an order categorized by type, complete with an efficient Search feature.
- **Order Tracking Updates**: Add new items to an existing `PENDING` order without creating duplicate orders.
- **Complete Checkout**: Select between "Cash" and "Online" payment methods to settle a table's bill.
- **Sales Dashboard**: Real-time sales insights showing today's revenue, occupied tables, completed orders, and a payment method breakdown.
- **Kitchen Order Tickets (KOT)**: Auto-generate printable tickets for the kitchen as soon as an order is placed.
- **Configurable Settings**: A dedicated admin panel to update restaurant details, currency locales, taxation logic, and manage menus.

## Technology Stack

- **Frontend/Backend**: [Next.js 15](https://nextjs.org/) (App Directory)
- **Styling**: Vanilla CSS (`globals.css`) with a sleek glassmorphism dark theme. No Tailwind dependencies.
- **Database**: MySQL database connection pool via `mysql2/promise`.

## Getting Started

### Prerequisites

- Node.js (v18+)
- Local MySQL Server running (e.g. via Homebrew)

### 1. Database Configuration

Create a `.env.local` file at the root of the project:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3307  # Update to your local MySQL port
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=restaurant_billing
```

### 2. Install & Start

```bash
npm install
npm run dev
```

The database schema will automatically initialize and seed standard settings and menu data on the first successful API connection.

Open [http://localhost:3000](http://localhost:3000) with your browser to launch the Table Dashboard.

## Accessing from Multiple Devices

This POS application is designed to be accessible across any device (tablets, mobiles, etc.) connected to your local network.

1. Find your host computer's Local IP Address (e.g. `192.168.1.50`).
2. Start the development server and bind it to all network interfaces:
   ```bash
   npm run dev -- -H 0.0.0.0
   ```
3. On your tablet or secondary device, open a web browser and navigate to `http://192.168.1.50:3000`.

## Docker vs GitHub Deployment

**GitHub** is for storing and maintaining your source code version history. It prevents data loss of your codebase and allows teams to collaborate. **Always use GitHub** for version control.

**Docker** is for containerizing the application so it is easy to deploy anywhere (like AWS, DigitalOcean, or an on-premise dedicated server) without manually installing Node.js and MySQL over and over again. **Use Docker** when you are ready to package the app for production deployment.

## License
MIT
# restaurant-billing-app
# restaurant-billing-app
