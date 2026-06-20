const Student = require('./student.model');
const User = require('../user/user.model');

const ALLOWED_STUDENT_PROFILE_FIELDS = [
  'grade',
  'school',
  'subjects',
  'interests',
  'learningStyle',
  'knowledgeLevel',
];

const LEARNING_STYLES = new Set(['visual', 'auditory', 'kinesthetic', 'reading_writing']);
const KNOWLEDGE_LEVELS = new Set(['beginner', 'intermediate', 'advanced']);

const cleanStringArray = (values, maxItems) => {
  if (!Array.isArray(values)) return [];

  const seen = new Set();
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxItems);
};

const pickProfilePayload = (payload = {}) => {
  const clean = {};

  for (const field of ALLOWED_STUDENT_PROFILE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) continue;

    if (field === 'grade') {
      const grade = Number(payload.grade);
      if (Number.isInteger(grade) && grade >= 1 && grade <= 12) clean.grade = grade;
      continue;
    }

    if (field === 'subjects') {
      clean.subjects = cleanStringArray(payload.subjects, 12);
      continue;
    }

    if (field === 'interests') {
      clean.interests = cleanStringArray(payload.interests, 20);
      continue;
    }

    if (field === 'learningStyle') {
      if (LEARNING_STYLES.has(payload.learningStyle)) clean.learningStyle = payload.learningStyle;
      continue;
    }

    if (field === 'knowledgeLevel') {
      if (KNOWLEDGE_LEVELS.has(payload.knowledgeLevel)) clean.knowledgeLevel = payload.knowledgeLevel;
      continue;
    }

    if (field === 'school' && typeof payload.school === 'string') {
      clean.school = payload.school.trim();
    }
  }

  return clean;
};

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

  const student = await Student.create({ userId, ...pickProfilePayload(payload) });
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
  const cleanPayload = pickProfilePayload(payload);

  if (Object.keys(cleanPayload).length === 0) {
    return getStudentProfile(userId);
  }

  const student = await Student.findOneAndUpdate(
    { userId },
    { $set: cleanPayload },
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
