const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize SQLite database
const db = new sqlite3.Database(':memory:');

// Create transactions table
db.serialize(() => {
    db.run(`CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        amount REAL,
        description TEXT,
        date TEXT,
        balance REAL
    )`);
});

// Routes
app.post('/transactions', (req, res) => {
    const { type, amount, description } = req.body;
    const date = new Date().toISOString().split('T')[0];

    // Calculate running balance
    db.get(`SELECT balance FROM transactions ORDER BY id DESC LIMIT 1`, (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        const prevBalance = row ? row.balance : 0;
        const newBalance = type === 'Credit' ? prevBalance + amount : prevBalance - amount;

        // Insert new transaction
        const stmt = db.prepare(`INSERT INTO transactions (type, amount, description, date, balance) VALUES (?, ?, ?, ?, ?)`);
        stmt.run(type, amount, description, date, newBalance, function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, type, amount, description, date, balance: newBalance });
        });
        stmt.finalize();
    });
});

app.get('/transactions', (req, res) => {
    db.all(`SELECT * FROM transactions ORDER BY id DESC`, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});