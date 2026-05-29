const userService = require('./user.service');

const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await userService.getUserProfile(userId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await userService.updateUserProfile(userId, req.body);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    const data = await userService.changePassword(userId, currentPassword, newPassword);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const verifyPhone = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await userService.verifyPhone(userId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const completeProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await userService.completeProfile(userId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  verifyPhone,
  completeProfile,
};