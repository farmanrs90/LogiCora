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

// POST /api/centers/apply — istifadəçi mərkəz müraciəti göndərir
const applyForCenter = async (req, res, next) => {
  try {
    const data = await centerService.submitApplication(req.user._id, req.body);
    return res.status(201).json({ success: true, data, message: 'Müraciətiniz göndərildi.' });
  } catch (error) {
    return next(error);
  }
};

// GET /api/centers/my-application — istifadəçinin müraciət vəziyyəti
const getMyApplication = async (req, res, next) => {
  try {
    const data = await centerService.getMyApplication(req.user._id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

// GET /api/centers/applications — admin: müraciət siyahısı
const listApplications = async (req, res, next) => {
  try {
    const data = await centerService.listApplications(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/centers/applications/:id/review — admin: təsdiq/rədd
const reviewApplication = async (req, res, next) => {
  try {
    const data = await centerService.reviewApplication(req.user._id, req.params.id, req.body);
    return res.status(200).json({ success: true, data, message: 'Müraciət yeniləndi.' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getPublicCenters,
  getMyCenter,
  getAdminCenters,
  applyForCenter,
  getMyApplication,
  listApplications,
  reviewApplication,
};
