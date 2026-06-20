const adminService = require('./admin.service');

// GET /api/admin/overview — read-only platforma icmalı (yalnız admin).
const getOverview = async (req, res, next) => {
  try {
    const data = await adminService.getOverview();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getOverview };
