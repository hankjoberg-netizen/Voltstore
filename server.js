// server.js — Express app for VoltStore (safe + Vercel-ready)
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

/* ------------ Views & Static ------------ */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));           // /views at repo root
app.use(express.static(path.join(__dirname, 'public')));    // serves /public/*
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* ------------ Load products safely ------------ */
const PRODUCTS_FILE = path.join(__dirname, 'products.json');
let PRODUCTS = [];
try {
  if (fs.existsSync(PRODUCTS_FILE)) {
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8') || '[]';
    const parsed = JSON.parse(raw);
    PRODUCTS = Array.isArray(parsed) ? parsed : [];
  }
} catch (e) {
  console.error('Failed to load products.json:', e);
  PRODUCTS = [];
}

/* ------------ Helpers ------------ */
const asMoney = (val) => {
  const n = Number(val);
  if (Number.isFinite(n)) return n.toFixed(2);
  const parsed = Number(String(val).replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
};

/* ------------ Routes ------------ */

// Health (quick test)
app.get('/health', (_req, res) => res.status(200).type('text').send('ok'));

// Home — exactly 8 products (4 + 4)
app.get('/', (req, res, next) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    let list = PRODUCTS;
    if (q) {
      list = PRODUCTS.filter(p =>
        ((p.name || '') + ' ' + (p.description || '')).toLowerCase().includes(q)
      );
    }
    const featured = list.slice(0, 8);
    res.render('index', { products: featured, q, asMoney });
  } catch (err) {
    next(err);
  }
});

// Product detail
app.get('/product/:id', (req, res, next) => {
  try {
    const p = PRODUCTS.find(x => String(x.id) === String(req.params.id));
    if (!p) return res.status(404).type('text').send('Product not found');
    res.render('product', { p, asMoney });
  } catch (err) {
    next(err);
  }
});

// Error handler (surface real error text in logs)
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).type('text').send('Internal Error: ' + (err?.message || 'unknown'));
});

// Export for Vercel (no app.listen() here)
module.exports = app;
