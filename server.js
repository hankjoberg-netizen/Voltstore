// server.js — plain Express app (exported), works on Vercel and locally
const express = require('express');
const path = require('path');
const products = require('./products.json');

const app = express();

// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static assets
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));

// Helpers available to EJS
app.locals.asMoney = (n) => Number(n).toFixed(2);

// Routes
app.get('/api/health', (req, res) => res.status(200).json({ ok: true }));

app.get('/', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  let list = products;
  if (q) {
    list = products.filter(p =>
      [p.name, p.description].join(' ').toLowerCase().includes(q)
    );
  }
  // show 8 items (4x2 grid)
  list = list.slice(0, 8);
  res.render('index', { products: list, q });
});

app.get('/product/:id', (req, res) => {
  const p = products.find(x => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).send('Not found');
  res.render('product', { p });
});

// Export for Vercel
module.exports = app;

// Run locally: `node server.js`
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
}
