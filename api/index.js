// api/index.js
const serverless = require('serverless-http');
const app = require('../server'); // your Express app (from server.js)
module.exports = serverless(app);
