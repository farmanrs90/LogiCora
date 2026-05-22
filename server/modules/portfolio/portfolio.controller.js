const portfolioService = require('./portfolio.service');

const getMyPortfolio = async (req, res) => {
  const portfolio = await portfolioService.getMyPortfolio(req.user._id);
  res.status(200).json({ success: true, data: portfolio, message: 'Portfolio alındı.' });
};

const getPortfolioByLink = async (req, res) => {
  const portfolio = await portfolioService.getPortfolioByLink(
    req.params.link,
    req.user || null
  );
  res.status(200).json({ success: true, data: portfolio, message: 'Portfolio alındı.' });
};

const updateVisibility = async (req, res) => {
  const portfolio = await portfolioService.updateVisibility(req.user._id, req.body.isPublic);
  res.status(200).json({ success: true, data: portfolio, message: 'Görünürlük yeniləndi.' });
};

const regenerateLink = async (req, res) => {
  const portfolio = await portfolioService.regenerateLink(req.user._id);
  res.status(200).json({ success: true, data: portfolio, message: 'Yeni link yaradıldı.' });
};

module.exports = {
  getMyPortfolio,
  getPortfolioByLink,
  updateVisibility,
  regenerateLink,
};
