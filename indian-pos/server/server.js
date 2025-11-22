const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;
const db = new sqlite3.Database('./restaurant.db');

app.use(cors());
app.use(bodyParser.json());

// GET /api/tables - Get all tables status
app.get('/api/tables', (req, res) => {
    db.all("SELECT * FROM active_tables ORDER BY table_id", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Parse JSON string back to object
        const tables = rows.map(row => ({
            ...row,
            current_order: JSON.parse(row.current_order_json || '[]')
        }));
        res.json(tables);
    });
});

// GET /api/products - Get menu
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST /api/orders - Update order for a table
app.post('/api/orders', (req, res) => {
    const { table_id, items, customer_name } = req.body;
    // items is array of { id, name, price, quantity }

    const status = items.length > 0 ? 'occupied' : 'available';
    const jsonItems = JSON.stringify(items);

    db.run(
        `UPDATE active_tables SET status = ?, current_order_json = ?, customer_name = ? WHERE table_id = ?`,
        [status, jsonItems, customer_name || '', table_id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, table_id, status });
        }
    );
});

// POST /api/checkout - Settle bill
app.post('/api/checkout', (req, res) => {
    const { table_id, total_amount } = req.body;

    // Calculate Kitten Tokens
    const tokens_earned = Math.floor(total_amount / 100);

    db.serialize(() => {
        // 1. Record Sale
        db.run(
            `INSERT INTO sales_history (total_amount, tokens_earned) VALUES (?, ?)`,
            [total_amount, tokens_earned],
            (err) => {
                if (err) console.error("Error saving history:", err);
            }
        );

        // 2. Reset Table
        db.run(
            `UPDATE active_tables SET status = 'available', current_order_json = '[]', customer_name = NULL WHERE table_id = ?`,
            [table_id],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, tokens_earned });
            }
        );
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
