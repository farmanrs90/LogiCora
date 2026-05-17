const attendanceService = require('./attendance.service');
const Teacher = require('../teacher/teacher.model');
const Student = require('../student/student.model');

const createSession = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.id });
    if (!teacher) {
      const error = new Error('Teacher profile not found');
      error.statusCode = 404;
      throw error;
    }

    const { groupId, date } = req.body;
    const session = await attendanceService.createSession(teacher._id, groupId, date);
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

const markAttendance = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.id });
    if (!teacher) {
      const error = new Error('Teacher profile not found');
      error.statusCode = 404;
      throw error;
    }

    const { sessionId } = req.params;
    const { records } = req.body;
    const session = await attendanceService.markAttendance(sessionId, teacher._id, records);
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

const getSessionById = async (req, res, next) => {
  try {
    const session = await attendanceService.getSessionById(req.params.sessionId);
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

const getGroupSessions = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { startDate, endDate } = req.query;
    const sessions = await attendanceService.getGroupSessions(groupId, startDate, endDate);
    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
};

const getMyAttendance = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      const error = new Error('Student profile not found');
      error.statusCode = 404;
      throw error;
    }

    const { groupId } = req.query;
    const attendance = await attendanceService.getStudentAttendance(student._id.toString(), groupId);
    res.json({ success: true, data: attendance });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSession,
  markAttendance,
  getSessionById,
  getGroupSessions,
  getMyAttendance,
};
