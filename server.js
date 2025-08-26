const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('cookie-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: 'voltstore-secret',
    resave: false,
    saveUninitialized: true,
  })
);

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Load products
const productsPath = path.join(__dirname, 'products.json');
let products = [];
if (fs.existsSync(productsPath)) {
  products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
}

// Routes
app.get('/', (req, res) => {
  res.render('index', { products });
});

app.get('/product/:id', (req, res) => {
  const product = products.find(p => p.id == req.params.id);
  if (!product) return res.status(404).send('Product not found');
  res.render('product', { product });
});

// Test route
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Export for Vercel (via api/index.js) or run locally
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => console.log(`Running locally at http://localhost:${PORT}`));
}
