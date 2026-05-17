const analyticsService = require('./analytics.service');
const Student = require('../student/student.model');

const getMyStats = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      const error = new Error('Student profile not found');
      error.statusCode = 404;
      throw error;
    }

    const stats = await analyticsService.getStudentStats(student._id);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

const getGroupStats = async (req, res, next) => {
  try {
    const stats = await analyticsService.getGroupStats(req.params.groupId);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

const getPlatformStats = async (req, res, next) => {
  try {
    const stats = await analyticsService.getPlatformStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyStats,
  getGroupStats,
  getPlatformStats,
};
