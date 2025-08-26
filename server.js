
const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Stripe (optional)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  const Stripe = require('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Views & static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Cookie-based session (works on serverless)
app.use(cookieSession({
  name: 'voltstore_sess',
  keys: [process.env.SESSION_SECRET || 'devsecret'],
  maxAge: 1000 * 60 * 60 * 24 * 7
}));

// Load products
const productsPath = path.join(__dirname, 'products.json');
let PRODUCTS = [];
try { PRODUCTS = JSON.parse(fs.readFileSync(productsPath, 'utf-8')); } catch (e) { PRODUCTS = []; }

function findProduct(id) { return PRODUCTS.find(p => p.id === id); }
function ensureCart(req) {
  if (!req.session.cart) req.session.cart = { items: [], total: 0, totalQty: 0 };
  return req.session.cart;
}
function recalcCart(cart) {
  let total = 0, qty = 0;
  cart.items.forEach(item => { total += item.product.price * item.qty; qty += item.qty; });
  cart.total = total; cart.totalQty = qty;
}

app.use((req, res, next) => { res.locals.cart = req.session.cart || { items: [], total: 0, totalQty: 0 }; next(); });

// Routes
app.get('/', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  let filtered = PRODUCTS;
  if (q) {
    filtered = PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
    );
  }
  res.render('index', { products: filtered, q });
});

app.get('/product/:id', (req, res) => {
  const product = findProduct(req.params.id);
  if (!product) return res.status(404).send('Product not found');
  res.render('product', { product });
});

app.get('/cart', (req, res) => {
  const cart = ensureCart(req);
  res.render('cart', { cart });
});

app.post('/cart/add', (req, res) => {
  const { id, qty } = req.body;
  const product = findProduct(id);
  if (!product) return res.status(400).send('Invalid product');
  const cart = ensureCart(req);
  const existing = cart.items.find(i => i.product.id === id);
  const q = Math.max(1, parseInt(qty || '1', 10));
  if (existing) existing.qty += q; else cart.items.push({ product, qty: q });
  recalcCart(cart);
  res.redirect('/cart');
});

app.post('/cart/remove', (req, res) => {
  const { id } = req.body;
  const cart = ensureCart(req);
  cart.items = cart.items.filter(i => i.product.id !== id);
  recalcCart(cart);
  res.redirect('/cart');
});

app.post('/cart/update', (req, res) => {
  const cart = ensureCart(req);
  cart.items.forEach(item => {
    const field = `qty_${item.product.id}`;
    const newQty = Math.max(1, parseInt(req.body[field] || item.qty, 10));
    item.qty = newQty;
  });
  recalcCart(cart);
  res.redirect('/cart');
});

function saveOrder(order) {
  try {
    const ordersFile = path.join(__dirname, 'data', 'orders.json');
    let orders = [];
    try { orders = JSON.parse(fs.readFileSync(ordersFile, 'utf-8') || '[]'); } catch {}
    orders.push(order);
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
  } catch {}
}
function updateOrderStatus(sessionId, status) {
  try {
    const ordersFile = path.join(__dirname, 'data', 'orders.json');
    let orders = [];
    try { orders = JSON.parse(fs.readFileSync(ordersFile, 'utf-8') || '[]'); } catch {}
    const idx = orders.findIndex(o => o.session_id === sessionId);
    if (idx >= 0) { orders[idx].status = status; fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2)); }
  } catch {}
}

app.post('/checkout', async (req, res) => {
  const cart = ensureCart(req);
  if (!cart.items.length) return res.redirect('/cart');

  if (!stripe) {
    return res.send(`Stripe isn't configured. Add STRIPE_SECRET_KEY to enable checkout.`);
  }
  try {
    const line_items = cart.items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: { name: item.product.name, images: [item.product.image] },
        unit_amount: Math.round(item.product.price * 100),
      },
      quantity: item.qty,
    }));

    const successUrl = (process.env.BASE_URL || `http://localhost:${PORT}`) + '/success?session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl  = (process.env.BASE_URL || `http://localhost:${PORT}`) + '/cancel';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: successUrl,
      cancel_url: cancelUrl,
      shipping_address_collection: { allowed_countries: ['US','CA','GB','AU'] },
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true
    });

    const order = {
      id: uuidv4(),
      session_id: session.id,
      status: 'pending',
      items: cart.items.map(i => ({ id: i.product.id, name: i.product.name, price: i.product.price, qty: i.qty })),
      total: cart.total,
      created_at: new Date().toISOString()
    };
    saveOrder(order);

    res.redirect(303, session.url);
  } catch (err) {
    console.error(err);
    res.status(500).send('Checkout error.');
  }
});

app.get('/success', async (req, res) => {
  const sessionId = req.query.session_id;
  let orderData = null;

  if (stripe && sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['customer_details'] });
      updateOrderStatus(sessionId, 'paid');
      const shipping = session.shipping || {};
      const addr = shipping.address || {};
      const addrStr = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country]
        .filter(Boolean).join(', ');
      orderData = {
        id: sessionId,
        email: session.customer_details && session.customer_details.email,
        shipping_name: shipping.name || (session.customer_details && session.customer_details.name) || 'Customer',
        shipping_address: addrStr
      };
    } catch (e) {
      console.error('Failed to retrieve session', e);
    }
  }
  req.session.cart = { items: [], total: 0, totalQty: 0 };
  res.render('checkout_success', { order: orderData });
});

app.get('/cancel', (req, res) => { res.render('checkout_cancel'); });

// Export app for Vercel, or listen locally for dev
if (process.env.VERCEL || process.env.NOW_REGION) {
  // Running on Vercel serverless
  module.exports = app;
} else {
  // Running locally
  app.listen(PORT, () => console.log(`VoltStore listening on http://localhost:${PORT}`));
}
