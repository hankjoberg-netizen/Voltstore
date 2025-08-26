// api/index.js — bridge: run Express app on Vercel
const serverless = require('serverless-http');
const app = require('../server');
module.exports = serverless(app);
