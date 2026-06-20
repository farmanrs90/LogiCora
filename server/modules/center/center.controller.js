const centerService = require('./center.service');

// GET /api/centers/public — aktiv mərkəzlər (display, joinCode-suz)
const getPublicCenters = async (req, res, next) => {
  try {
    const data = await centerService.getPublicCenters();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

// GET /api/centers/me — müəllimin öz mərkəzi və ya independent vəziyyəti
const getMyCenter = async (req, res, next) => {
  try {
    const data = await centerService.getMyCenter(req.user._id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

// GET /api/centers/admin — read-only siyahı (yalnız admin)
const getAdminCenters = async (req, res, next) => {
  try {
    const data = await centerService.getAdminCenters();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getPublicCenters, getMyCenter, getAdminCenters };
