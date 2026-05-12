const teacherService = require('./teacher.service');

const createTeacher = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await teacherService.createTeacherProfile(userId, req.body);
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
};

const getTeacher = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await teacherService.getTeacherProfile(userId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const updateTeacher = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await teacherService.updateTeacherProfile(userId, req.body);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const deleteTeacher = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await teacherService.deleteTeacherProfile(userId);
    return res.status(200).json({ message: 'Teacher profile deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

const getAllTeachers = async (req, res, next) => {
  try {
    const filters = {
      specialization: req.query.specialization,
      isVerified: req.query.isVerified === 'true',
    };
    const data = await teacherService.getAllTeachers(filters);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const addGroup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { groupId } = req.body;
    const data = await teacherService.addGroupToTeacher(userId, groupId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const removeGroup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { groupId } = req.params;
    const data = await teacherService.removeGroupFromTeacher(userId, groupId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createTeacher,
  getTeacher,
  updateTeacher,
  deleteTeacher,
  getAllTeachers,
  addGroup,
  removeGroup,
};