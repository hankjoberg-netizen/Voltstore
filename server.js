const express = require('express');
const bodyParser = require('body-parser');
const session = require('cookie-session');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'secret'],
    maxAge: 24 * 60 * 60 * 1000
  })
);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Load products
const PRODUCTS = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'products.json')));

// Routes
app.get('/', (req, res) => {
  res.render('index', { products: PRODUCTS, q: '' });
});

app.get('/product/:id', (req, res) => {
  const product = PRODUCTS.find(p => p.id === req.params.id);
  if (!product) return res.status(404).send('Product not found');
  res.render('product', { product });
});

app.get('/cart', (req, res) => {
  const cart = req.session.cart || { items: [], total: 0 };
  res.render('cart', { cart });
});

app.post('/cart/add', (req, res) => {
  const { id } = req.body;
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return res.status(404).send('Not found');

  if (!req.session.cart) req.session.cart = { items: [], total: 0 };
  req.session.cart.items.push(product);
  req.session.cart.total += product.price;

  res.redirect('/cart');
});

app.post('/checkout', async (req, res) => {
  if (!stripe) return res.send('Stripe not configured');
  const cart = req.session.cart || { items: [], total: 0 };

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: cart.items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: item.price * 100
        },
        quantity: 1
      })),
      success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/cancel`,
      shipping_address_collection: { allowed_countries: ['US'] }
    });

    res.redirect(303, session.url);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating checkout session');
  }
});

app.get('/success', async (req, res) => {
  const sessionId = req.query.session_id;
  let orderData = {};

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer_details']
    });
    const shipping = session.shipping || {};
    const addr = shipping.address || {};
    const addrStr = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country]
      .filter(Boolean)
      .join(', ');

    orderData = {
      id: sessionId,
      email: session.customer_details?.email,
      shipping_name: shipping.name || session.customer_details?.name || 'Customer',
      shipping_address: addrStr
    };
  } catch (e) {
    console.error('Failed to retrieve session', e);
  }

  req.session.cart = { items: [], total: 0 };
  res.render('checkout_success', { order: orderData });
});

app.get('/cancel', (req, res) => res.render('checkout_cancel'));

// 🟢 Test route for debugging
app.get('/ping', (req, res) => {
  res.send('pong');
});

// 🟢 Export for Vercel or run locally
if (process.env.VERCEL || process.env.NOW_REGION) {
  module.exports = app;
} else {
  app.listen(PORT, () => console.log(`VoltStore listening on http://localhost:${PORT}`));
}
