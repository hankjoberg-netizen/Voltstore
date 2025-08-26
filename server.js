// server.js
// VoltStore – Express server wired for Vercel (@vercel/node)
// Views: EJS in /views, static assets in /public, data in /products.json

const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('cookie-session');

const app = express();

/* --------------------------- App & middleware --------------------------- */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // absolute path for serverless
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// lightweight session for cart
app.use(
  session({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'secret'],
    // 24 hours
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  })
);

// ensure cart exists
app.use((req, res, next) => {
  if (!req.session.cart) req.session.cart = { items: [], totalQty: 0, total: 0 };
  next();
});

/* ------------------------------ Data load ------------------------------ */
const PRODUCTS_PATH = path.join(__dirname, 'products.json');
let products = [];
try {
  products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
} catch (e) {
  console.error('Failed to read products.json:', e);
  products = [];
}

const findProduct = (id) => products.find((p) => String(p.id) === String(id));

const priceToNumber = (p) =>
  typeof p === 'number' ? p : Number(String(p).replace(/[^0-9.]/g, '') || 0);

const computeTotals = (items) => {
  let total = 0;
  let totalQty = 0;
  for (const it of items) {
    const p = findProduct(it.id);
    if (!p) continue;
    const unit = priceToNumber(p.price);
    total += unit * it.qty;
    totalQty += it.qty;
  }
  return { total, totalQty };
};

const filterProducts = (q) => {
  if (!q) return products;
  const needle = q.toLowerCase();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(needle) ||
      (p.description || '').toLowerCase().includes(needle)
  );
};

/* -------------------------------- Routes -------------------------------- */

// Health check
app.get('/ping', (req, res) => res.send('pong'));

// Home / catalog with simple search
app.get('/', (req, res) => {
  const q = req.query.q || '';
  res.render('index', {
    title: 'Shop Tech Gadgets',
    products: filterProducts(q),
    q
  });
});

// Product detail
app.get('/product/:id', (req, res) => {
  const product = findProduct(req.params.id);
  if (!product) return res.status(404).send('Product not found');
  res.render('product', { title: product.name, product });
});

// View cart
app.get('/cart', (req, res) => {
  const items = req.session.cart.items.map((it) => {
    const p = findProduct(it.id);
    return p
      ? {
          id: p.id,
          name: p.name,
          price: p.price,
          image: p.image,
          qty: it.qty,
          subtotal: priceToNumber(p.price) * it.qty
        }
      : null;
  }).filter(Boolean);

  const totals = computeTotals(req.session.cart.items);
  req.session.cart.total = totals.total;
  req.session.cart.totalQty = totals.totalQty;

  res.render('cart', {
    title: 'Your Cart',
    items,
    total: totals.total,
    totalQty: totals.totalQty
  });
});

// Add to cart
app.post('/cart/add', (req, res) => {
  const { id, qty } = req.body;
  const product = findProduct(id);
  const amount = Math.max(1, parseInt(qty || '1', 10));
  if (!product) return res.status(400).send('Invalid product');

  const existing = req.session.cart.items.find((it) => String(it.id) === String(id));
  if (existing) existing.qty += amount;
  else req.session.cart.items.push({ id: product.id, qty: amount });

  const totals = computeTotals(req.session.cart.items);
  req.session.cart.total = totals.total;
  req.session.cart.totalQty = totals.totalQty;

  // Redirect back to product page by default
  res.redirect(`/product/${product.id}`);
});

// Remove from cart
app.post('/cart/remove', (req, res) => {
  const { id } = req.body;
  req.session.cart.items = req.session.cart.items.filter(
    (it) => String(it.id) !== String(id)
  );
  const totals = computeTotals(req.session.cart.items);
  req.session.cart.total = totals.total;
  req.session.cart.totalQty = totals.totalQty;
  res.redirect('/cart');
});

// Fake checkout success (no Stripe) – shows order summary
app.get('/checkout/success', (req, res) => {
  const items = req.session.cart.items.map((it) => {
    const p = findProduct(it.id);
    return p
      ? {
          id: p.id,
          name: p.name,
          price: p.price,
          image: p.image,
          qty: it.qty,
          subtotal: priceToNumber(p.price) * it.qty
        }
      : null;
  }).filter(Boolean);

  const totals = computeTotals(req.session.cart.items);
  const order = {
    id: `order_${Date.now()}`,
    email: 'customer@example.com',
    shipping_name: 'Customer',
    shipping_address: 'Provided at checkout',
    items,
    total: totals.total
  };

  // Clear cart after “checkout”
  req.session.cart = { items: [], totalQty: 0, total: 0 };

  res.render('checkout_success', { title: 'Order Complete', order });
});

// Optional cancel page
app.get('/checkout/cancel', (req, res) =>
  res.render('checkout_cancel', { title: 'Checkout canceled' })
);

/* ------------------------- Export / local listen ------------------------- */
// On Vercel we export the app for the serverless handler.
// Locally (Replit etc.), we listen on a port.
if (process.env.VERCEL || process.env.NOW_REGION) {
  module.exports = app;
} else {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`VoltStore running locally on http://localhost:${PORT}`)
  );
}
