const gamificationService = require('./gamification.service');
const Student = require('../student/student.model');

const getMyProfile = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      const error = new Error('Student profile not found');
      error.statusCode = 404;
      throw error;
    }

    const profile = await gamificationService.getMyProfile(student._id);
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

const getGroupLeaderboard = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const leaderboard = await gamificationService.getGroupLeaderboard(groupId);
    res.json({ success: true, data: leaderboard });
  } catch (err) {
    next(err);
  }
};

const getNationalLeaderboard = async (req, res, next) => {
  try {
    const leaderboard = await gamificationService.getNationalLeaderboard();
    res.json({ success: true, data: leaderboard });
  } catch (err) {
    next(err);
  }
};

const getAllBadges = async (req, res, next) => {
  try {
    const { ALL_BADGES } = require('./badges');
    res.json({ success: true, data: ALL_BADGES });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyProfile,
  getGroupLeaderboard,
  getNationalLeaderboard,
  getAllBadges,
};
