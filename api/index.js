module.exports = (req, res) => {
  res.setHeader('content-type', 'text/plain; charset=utf-8');
  if (req.url === '/ping') return res.status(200).end('pong');
  return res.status(200).end('root ok');
};
