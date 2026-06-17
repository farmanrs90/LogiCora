const parentService = require('./parent.service');

const createParent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await parentService.createParentProfile(userId, req.body);
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
};

const getParent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await parentService.getParentProfile(userId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const updateParent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await parentService.updateParentProfile(userId, req.body);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const deleteParent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await parentService.deleteParentProfile(userId);
    return res.status(200).json({ message: 'Parent profile deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

const addChild = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { childEmail, childId } = req.body || {};
    const data = await parentService.addChild(userId, { childEmail, childId });
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const removeChild = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { childId } = req.params;
    const data = await parentService.removeChild(userId, childId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};
// ── Dashboard (read-only) handler-ləri — XAM body qaytarır (frontend r.data oxuyur) ──
const getChildrenList = async (req, res, next) => {
  try {
    const data = await parentService.getChildren(req.user.id);
    return res.status(200).json(data);
  } catch (error) { return next(error); }
};

const getChildStats = async (req, res, next) => {
  try {
    const data = await parentService.getChildStats(req.user.id, req.params.id);
    return res.status(200).json(data);
  } catch (error) { return next(error); }
};

const getWeeklyReport = async (req, res, next) => {
  try {
    const data = await parentService.getWeeklyReport(req.user.id);
    return res.status(200).json(data);
  } catch (error) { return next(error); }
};

const getChildAttendance = async (req, res, next) => {
  try {
    const data = await parentService.getChildAttendance(req.user.id, req.params.id);
    return res.status(200).json(data);
  } catch (error) { return next(error); }
};

const getChildTeachers = async (req, res, next) => {
  try {
    const data = await parentService.getChildTeachers(req.user.id, req.params.id);
    return res.status(200).json(data);
  } catch (error) { return next(error); }
};

const getPayments = async (req, res, next) => {
  try {
    const data = await parentService.getPayments(req.user.id);
    return res.status(200).json(data);
  } catch (error) { return next(error); }
};

const getChildActivity = async (req, res, next) => {
  try {
    const data = await parentService.getChildActivity(req.user.id, req.params.id);
    return res.status(200).json(data);
  } catch (error) { return next(error); }
};

const getChildProgress = async (req, res, next) => {
  try {
    const data = await parentService.getChildProgress(req.user.id, req.params.id);
    return res.status(200).json(data);
  } catch (error) { return next(error); }
};

const getTimeCapsules = async (req, res, next) => {
  try {
    const data = await parentService.getTimeCapsules(req.user.id);
    return res.status(200).json(data);
  } catch (error) { return next(error); }
};

const createTimeCapsule = async (req, res, next) => {
  try {
    const data = await parentService.createTimeCapsule(req.user.id, req.body);
    return res.status(201).json(data);
  } catch (error) { return next(error); }
};

const getNotificationPreferences = async (req, res, next) => {
  try {
    const data = await parentService.getNotificationPreferences(req.user.id);
    return res.status(200).json(data);
  } catch (error) { return next(error); }
};

const updateNotificationPreferences = async (req, res, next) => {
  try {
    const data = await parentService.updateNotificationPreferences(req.user.id, req.body);
    return res.status(200).json(data);
  } catch (error) { return next(error); }
};



module.exports = {
  createParent,
  getParent,
  updateParent,
  deleteParent,
  addChild,
  removeChild,
  getChildrenList,
  getChildStats,
  getWeeklyReport,
  getChildAttendance,
  getChildTeachers,
  getPayments,
  getChildActivity,
  getChildProgress,
  getTimeCapsules,
  createTimeCapsule,
  getNotificationPreferences,
  updateNotificationPreferences,
};






