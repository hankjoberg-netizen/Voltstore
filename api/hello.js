// api/hello.js
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.statusCode = 200;
  res.end('OK ' + req.url);
};
