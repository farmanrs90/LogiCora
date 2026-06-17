const User = require('./user.model');
const { hashPassword, comparePassword } = require('../../utils/hashPassword');

const PROFILE_UPDATE_FIELDS = [
  'name',
  'surname',
  'phone',
  'characterType',
  'profileCompleted',
  'hobbies',
  'isSpecialNeeds',
  'specialNeedsType',
];

const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user;
};

const updateUserProfile = async (userId, payload) => {
  const safeUpdate = {};
  for (const field of PROFILE_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload || {}, field)) {
      safeUpdate[field] = payload[field];
    }
  }

  if (Object.keys(safeUpdate).length === 0) {
    return getUserProfile(userId);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: safeUpdate },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const isValid = await comparePassword(currentPassword, user.password);
  if (!isValid) {
    const error = new Error('Current password is incorrect');
    error.statusCode = 401;
    throw error;
  }

  const hashed = await hashPassword(newPassword);
  user.password = hashed;
  await user.save();

  return { message: 'Password changed successfully' };
};

const verifyPhone = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { isPhoneVerified: true },
    { new: true }
  ).select('-password');

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

const completeProfile = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { profileCompleted: true },
    { new: true }
  ).select('-password');

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword,
  verifyPhone,
  completeProfile,
};
