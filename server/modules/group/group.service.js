const Group = require('./group.model');
const Teacher = require('../teacher/teacher.model');
const Student = require('../student/student.model');

const createGroup = async (payload) => {
  const teacherExists = await Teacher.findById(payload.teacherId);
  if (!teacherExists) {
    const error = new Error('Teacher not found');
    error.statusCode = 404;
    throw error;
  }

  const group = await Group.create(payload);
  return group;
};

const getAllGroups = async () => {
  return Group.find()
    .populate('teacherId', 'specialization rating totalStudents')
    .populate('studentIds', 'grade school points level');
};

const getGroupById = async (groupId) => {
  const group = await Group.findById(groupId)
    .populate('teacherId', 'specialization rating totalStudents')
    .populate('studentIds', 'grade school points level');

  if (!group) {
    const error = new Error('Group not found');
    error.statusCode = 404;
    throw error;
  }

  return group;
};

const updateGroup = async (groupId, payload) => {
  const group = await Group.findByIdAndUpdate(
    groupId,
    { $set: payload },
    { new: true, runValidators: true }
  )
    .populate('teacherId', 'specialization rating totalStudents')
    .populate('studentIds', 'grade school points level');

  if (!group) {
    const error = new Error('Group not found');
    error.statusCode = 404;
    throw error;
  }

  return group;
};

const deleteGroup = async (groupId) => {
  const group = await Group.findByIdAndDelete(groupId);
  if (!group) {
    const error = new Error('Group not found');
    error.statusCode = 404;
    throw error;
  }

  return group;
};

const addStudentToGroup = async (groupId, studentId) => {
  const studentExists = await Student.findById(studentId);
  if (!studentExists) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const group = await Group.findByIdAndUpdate(
    groupId,
    { $addToSet: { studentIds: studentId } },
    { new: true }
  ).populate('studentIds', 'grade school points level');

  if (!group) {
    const error = new Error('Group not found');
    error.statusCode = 404;
    throw error;
  }

  return group;
};

const removeStudentFromGroup = async (groupId, studentId) => {
  const group = await Group.findByIdAndUpdate(
    groupId,
    { $pull: { studentIds: studentId } },
    { new: true }
  ).populate('studentIds', 'grade school points level');

  if (!group) {
    const error = new Error('Group not found');
    error.statusCode = 404;
    throw error;
  }

  return group;
};

module.exports = {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addStudentToGroup,
  removeStudentFromGroup,
};