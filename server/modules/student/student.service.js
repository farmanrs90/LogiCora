const Student = require('./student.model');
const User = require('../user/user.model');

const createStudentProfile = async (userId, payload) => {
  const userExists = await User.findById(userId);
  if (!userExists) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const studentExists = await Student.findOne({ userId });
  if (studentExists) {
    const error = new Error('Student profile already exists');
    error.statusCode = 409;
    throw error;
  }

  const student = await Student.create({ userId, ...payload });
  return student;
};

const getStudentProfile = async (userId) => {
  const student = await Student.findOne({ userId })
    .populate('userId', 'name surname email phone')
    .populate('enrolledGroups', 'name')
    .populate('parentId', 'userId');

  if (!student) {
    const error = new Error('Student profile not found');
    error.statusCode = 404;
    throw error;
  }

  return student;
};

const updateStudentProfile = async (userId, payload) => {
  const student = await Student.findOneAndUpdate(
    { userId },
    { $set: payload },
    { new: true, runValidators: true }
  ).populate('userId', 'name surname email phone');

  if (!student) {
    const error = new Error('Student profile not found');
    error.statusCode = 404;
    throw error;
  }

  return student;
};

const deleteStudentProfile = async (userId) => {
  const student = await Student.findOneAndDelete({ userId });
  if (!student) {
    const error = new Error('Student profile not found');
    error.statusCode = 404;
    throw error;
  }
  return student;
};

module.exports = {
  createStudentProfile,
  getStudentProfile,
  updateStudentProfile,
  deleteStudentProfile,
};
