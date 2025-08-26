// server.js
const path = require('path');
const express = require('express');

const app = express();

// Views (EJS) + static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Routes ---
// Home
app.get('/', (req, res) => {
  // If you already have views/index.ejs, this will render it.
  // Otherwise it will just send plain text so you at least see something.
  try {
    return res.render('index', { title: 'VoltStore' });
  } catch {
    return res.send('VoltStore home ✅');
  }
});

// Simple health check
app.get('/health', (_req, res) => res.status(200).send('ok'));

// Export for Vercel, listen locally for dev
const PORT = process.env.PORT || 3000;
if (process.env.VERCEL || process.env.NOW_REGION) {
  // Running on Vercel (Serverless)
  module.exports = app;
} else {
  // Running locally (Replit/Node)
  app.listen(PORT, () => {
    console.log(`VoltStore listening on http://localhost:${PORT}`);
  });
}
