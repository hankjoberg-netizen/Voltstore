module.exports = (req, res) => {
  res.status(200).type('text').send(`OK ${req.url}`);
};
