const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Simple homepage
app.get('/', (req, res) => {
  res.send('Hello from VoltStore 🚀');
});

// Test route
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Export for Vercel or run locally
if (process.env.VERCEL || process.env.NOW_REGION) {
  module.exports = app;
} else {
  app.listen(PORT, () => console.log(`VoltStore running locally on http://localhost:${PORT}`));
}
