const serverless = require('serverless-http');
const app = require('../server');

// IMPORTANT: export a handler for Vercel's Node runtime
module.exports = serverless(app);
