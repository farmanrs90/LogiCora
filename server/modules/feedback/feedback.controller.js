const feedbackService = require('./feedback.service');

// POST /api/feedback — authenticated user göndərir; rol req.user-dən götürülür.
const createFeedback = async (req, res, next) => {
  try {
    const data = await feedbackService.createFeedback(req.user.id, req.user.role, req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

// GET /api/feedback/my — istifadəçinin öz göndərdikləri.
const getMyFeedback = async (req, res, next) => {
  try {
    const data = await feedbackService.getMyFeedback(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

// GET /api/feedback/admin — yalnız admin (filtr/axtarış/səhifələmə).
const adminList = async (req, res, next) => {
  try {
    const data = await feedbackService.adminList(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/feedback/admin/:id/status — yalnız admin (status + adminNote).
const adminUpdateStatus = async (req, res, next) => {
  try {
    const data = await feedbackService.adminUpdateStatus(req.params.id, req.user.id, req.body);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createFeedback, getMyFeedback, adminList, adminUpdateStatus };
