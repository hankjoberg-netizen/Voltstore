// Minimal handler to confirm Vercel is serving our function
module.exports = (req, res) => {
  if (req.url === '/ping') return res.status(200).send('pong');
  return res.status(200).send('root ok');
};
