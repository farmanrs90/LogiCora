const studentService = require('./student.service');

const createStudent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await studentService.createStudentProfile(userId, req.body);
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
};

const getStudent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await studentService.getStudentProfile(userId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const updateStudent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await studentService.updateStudentProfile(userId, req.body);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await studentService.deleteStudentProfile(userId);
    return res.status(200).json({ message: 'Student profile deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createStudent,
  getStudent,
  updateStudent,
  deleteStudent,
};
