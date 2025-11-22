const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./restaurant.db');

db.serialize(() => {
    // 1. Products Table
    db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price_inr REAL NOT NULL,
    category TEXT
  )`);

    // 2. Active Tables (for current orders)
    db.run(`CREATE TABLE IF NOT EXISTS active_tables (
    table_id INTEGER PRIMARY KEY,
    status TEXT DEFAULT 'available', -- 'available' or 'occupied'
    current_order_json TEXT DEFAULT '[]',
    customer_name TEXT
  )`);

    // 3. Sales History
    db.run(`CREATE TABLE IF NOT EXISTS sales_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    total_amount REAL,
    tokens_earned INTEGER
  )`);

    // Seed Tables (1-12)
    const stmt = db.prepare("INSERT OR IGNORE INTO active_tables (table_id, status) VALUES (?, 'available')");
    for (let i = 1; i <= 12; i++) {
        stmt.run(i);
    }
    stmt.finalize();

    // Seed Products (Indian Cuisine)
    const products = [
        { name: 'Butter Chicken', price: 350, category: 'Main Course' },
        { name: 'Paneer Tikka', price: 280, category: 'Starters' },
        { name: 'Dal Makhani', price: 220, category: 'Main Course' },
        { name: 'Garlic Naan', price: 60, category: 'Breads' },
        { name: 'Jeera Rice', price: 150, category: 'Rice' },
        { name: 'Masala Chai', price: 40, category: 'Beverages' },
        { name: 'Gulab Jamun', price: 80, category: 'Dessert' },
        { name: 'Tandoori Roti', price: 30, category: 'Breads' },
        { name: 'Chicken Biryani', price: 320, category: 'Rice' },
        { name: 'Veg Manchurian', price: 200, category: 'Starters' }
    ];

    const prodStmt = db.prepare("INSERT INTO products (name, price_inr, category) VALUES (?, ?, ?)");
    // Clear existing products to avoid duplicates on re-run (optional, but good for dev)
    db.run("DELETE FROM products", () => {
        products.forEach(p => {
            prodStmt.run(p.name, p.price, p.category);
        });
        prodStmt.finalize();
        console.log("Database initialized with Indian Menu!");
    });
});

db.close();
