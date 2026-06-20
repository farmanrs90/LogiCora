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

// GET /api/admin/users?role=&q=&limit=&page= — read-only istifadəçi siyahısı.
const getUsers = async (req, res, next) => {
  try {
    const data = await adminService.listUsers(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

// GET /api/admin/courses?status=&q=&limit=&page= — read-only kurs siyahısı.
const getCourses = async (req, res, next) => {
  try {
    const data = await adminService.listCourses(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

// GET /api/admin/groups?limit=&page= — read-only qrup siyahısı.
const getGroups = async (req, res, next) => {
  try {
    const data = await adminService.listGroups(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getOverview, getUsers, getCourses, getGroups };
