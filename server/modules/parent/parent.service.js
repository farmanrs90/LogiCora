const Parent = require('./parent.model');
const User = require('../user/user.model');

const createParentProfile = async (userId, payload) => {
  const userExists = await User.findById(userId);
  if (!userExists) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const parentExists = await Parent.findOne({ userId });
  if (parentExists) {
    const error = new Error('Parent profile already exists');
    error.statusCode = 409;
    throw error;
  }

  const parent = await Parent.create({
    userId,
    ...payload,
  });

  return parent;
};

const getParentProfile = async (userId) => {
  const parent = await Parent.findOne({ userId })
    .populate('userId', 'name surname email phone')
    .populate('children', 'name email role');

  if (!parent) {
    const error = new Error('Parent profile not found');
    error.statusCode = 404;
    throw error;
  }

  return parent;
};

const updateParentProfile = async (userId, payload) => {
  const parent = await Parent.findOneAndUpdate(
    { userId },
    { $set: payload },
    { new: true, runValidators: true }
  ).populate('userId', 'name surname email phone');

  if (!parent) {
    const error = new Error('Parent profile not found');
    error.statusCode = 404;
    throw error;
  }

  return parent;
};

const deleteParentProfile = async (userId) => {
  const parent = await Parent.findOneAndDelete({ userId });
  if (!parent) {
    const error = new Error('Parent profile not found');
    error.statusCode = 404;
    throw error;
  }
  return parent;
};

const addChild = async (userId, childId) => {
  const parent = await Parent.findOneAndUpdate(
    { userId },
    { $addToSet: { children: childId } },
    { new: true }
  ).populate('children', 'name email');

  if (!parent) {
    const error = new Error('Parent profile not found');
    error.statusCode = 404;
    throw error;
  }

  return parent;
};

const removeChild = async (userId, childId) => {
  const parent = await Parent.findOneAndUpdate(
    { userId },
    { $pull: { children: childId } },
    { new: true }
  ).populate('children', 'name email');

  if (!parent) {
    const error = new Error('Parent profile not found');
    error.statusCode = 404;
    throw error;
  }

  return parent;
};

module.exports = {
  createParentProfile,
  getParentProfile,
  updateParentProfile,
  deleteParentProfile,
  addChild,
  removeChild,
};