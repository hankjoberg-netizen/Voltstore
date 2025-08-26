const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Load products.json
const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf-8'));

// Homepage (limit to 8 products → 4 top + 4 bottom)
app.get('/', (req, res) => {
  const featuredProducts = products.slice(0, 8);
  res.render('index', { products: featuredProducts });
});

// Ping test route
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Export for Vercel or run locally
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => console.log(`VoltStore running locally on http://localhost:${PORT}`));
}
