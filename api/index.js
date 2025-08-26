// api/index.js
const serverless = require('serverless-http');
const app = require('../server');  // uses your server.js
module.exports = serverless(app);
