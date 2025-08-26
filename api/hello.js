module.exports = (req, res) => {
  res.setHeader('content-type', 'text/plain; charset=utf-8');
  res.status(200).end('hello ok');
};
