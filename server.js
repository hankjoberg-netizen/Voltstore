const express = require('express');
const path = require('path');

const app = express();

// --- Views & static ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes you already have ---
app.get('/', (req, res) => {
  // If you have a views/index.ejs:
  // res.render('index', { /* pass data */ });
  // For a quick smoke test:
  res.type('text').send('home');
});

app.get('/ping', (req, res) => res.type('text').send('pong'));

// DO NOT app.listen() on Vercel serverless
// Vercel will call the handler from api/index.js
module.exports = app;
