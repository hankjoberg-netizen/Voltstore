// api/index.js  — Express app exported for Vercel (@vercel/node)
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// ---- Views & static assets ----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// ---- Data (products.json) ----
const productsPath = path.join(__dirname, '../products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

// ---- Routes ----
app.get('/', (req, res) => {
  res.render('index', { products, q: '' });
});

app.get('/product/:id', (req, res) => {
  const p = products.find(x => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).send('Product not found');
  res.render('product', { p });
});

// Health check
app.get('/ping', (req, res) => res.status(200).send('pong'));

// ---- Export the app (NO app.listen on Vercel) ----
module.exports = app;
