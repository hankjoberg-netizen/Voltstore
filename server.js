const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// views & static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// load products safely
const PRODUCTS_FILE = path.join(__dirname, 'products.json');
let products = [];
try {
  if (fs.existsSync(PRODUCTS_FILE)) {
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8') || '[]';
    products = JSON.parse(raw);
    if (!Array.isArray(products)) products = [];
  }
} catch (e) {
  console.error('Failed to load products.json:', e);
  products = [];
}

// home: exactly 8 items (4 + 4)
app.get('/', (req, res, next) => {
  try {
    const featured = Array.isArray(products) ? products.slice(0, 8) : [];
    res.render('index', { products: featured, q: '' });
  } catch (err) {
    next(err);
  }
});

// product page (optional; only if your template expects it)
app.get('/product/:id', (req, res, next) => {
  try {
    const p = (products || []).find(x => String(x.id) === String(req.params.id));
    if (!p) return res.status(404).send('Product not found');
    res.render('product', { p });
  } catch (err) {
    next(err);
  }
});

// health route to test quickly
app.get('/health', (_req, res) => res.status(200).send('ok'));

// error handler (so you see the real error in logs)
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).type('text').send('Internal Error: ' + (err?.message || 'unknown'));
});

// Export for Vercel serverless; no app.listen() here
module.exports = app;
