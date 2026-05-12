const Teacher = require('./teacher.model');
const User = require('../user/user.model');

const createTeacherProfile = async (userId, payload) => {
  const userExists = await User.findById(userId);
  if (!userExists) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const teacherExists = await Teacher.findOne({ userId });
  if (teacherExists) {
    const error = new Error('Teacher profile already exists');
    error.statusCode = 409;
    throw error;
  }

  const teacher = await Teacher.create({
    userId,
    ...payload,
  });

  return teacher;
};

const getTeacherProfile = async (userId) => {
  const teacher = await Teacher.findOne({ userId })
    .populate('userId', 'name surname email phone')
    .populate('groups');

  if (!teacher) {
    const error = new Error('Teacher profile not found');
    error.statusCode = 404;
    throw error;
  }

  return teacher;
};

const updateTeacherProfile = async (userId, payload) => {
  const teacher = await Teacher.findOneAndUpdate(
    { userId },
    { $set: payload },
    { new: true, runValidators: true }
  ).populate('userId', 'name surname email phone');

  if (!teacher) {
    const error = new Error('Teacher profile not found');
    error.statusCode = 404;
    throw error;
  }

  return teacher;
};

const deleteTeacherProfile = async (userId) => {
  const teacher = await Teacher.findOneAndDelete({ userId });

  if (!teacher) {
    const error = new Error('Teacher profile not found');
    error.statusCode = 404;
    throw error;
  }

  return teacher;
};

const getAllTeachers = async (filters = {}) => {
  const query = {};

  if (filters.specialization) {
    query.specialization = filters.specialization;
  }

  if (filters.isVerified !== undefined) {
    query.isVerified = filters.isVerified;
  }

  const teachers = await Teacher.find(query)
    .populate('userId', 'name surname email phone')
    .populate('groups');

  return teachers;
};

const addGroupToTeacher = async (userId, groupId) => {
  const teacher = await Teacher.findOneAndUpdate(
    { userId },
    { $addToSet: { groups: groupId } },
    { new: true }
  ).populate('groups');

  if (!teacher) {
    const error = new Error('Teacher profile not found');
    error.statusCode = 404;
    throw error;
  }

  return teacher;
};

const removeGroupFromTeacher = async (userId, groupId) => {
  const teacher = await Teacher.findOneAndUpdate(
    { userId },
    { $pull: { groups: groupId } },
    { new: true }
  ).populate('groups');

  if (!teacher) {
    const error = new Error('Teacher profile not found');
    error.statusCode = 404;
    throw error;
  }

  return teacher;
};

module.exports = {
  createTeacherProfile,
  getTeacherProfile,
  updateTeacherProfile,
  deleteTeacherProfile,
  getAllTeachers,
  addGroupToTeacher,
  removeGroupFromTeacher,
};