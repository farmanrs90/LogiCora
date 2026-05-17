const Attendance = require('./attendance.model');
const Group = require('../group/group.model');

const createSession = async (teacherId, groupId, date) => {
  const group = await Group.findById(groupId);
  if (!group) {
    const error = new Error('Group not found');
    error.statusCode = 404;
    throw error;
  }

  if (group.teacherId.toString() !== teacherId) {
    const error = new Error('Not authorized');
    error.statusCode = 403;
    throw error;
  }

  const sessionDate = new Date(date);
  sessionDate.setHours(0, 0, 0, 0);

  const exists = await Attendance.findOne({ groupId, date: sessionDate });
  if (exists) {
    const error = new Error('Session already exists for this date');
    error.statusCode = 409;
    throw error;
  }

  const records = group.studentIds.map((studentId) => ({
    studentId,
    status: 'absent',
  }));

  const session = await Attendance.create({
    groupId,
    teacherId,
    date: sessionDate,
    records,
  });

  return session;
};

const markAttendance = async (sessionId, teacherId, records) => {
  const session = await Attendance.findById(sessionId);
  if (!session) {
    const error = new Error('Session not found');
    error.statusCode = 404;
    throw error;
  }

  if (session.teacherId.toString() !== teacherId) {
    const error = new Error('Not authorized');
    error.statusCode = 403;
    throw error;
  }

  for (const update of records) {
    const record = session.records.find(
      (r) => r.studentId.toString() === update.studentId
    );
    if (record) {
      record.status = update.status;
      if (update.note !== undefined) record.note = update.note;
    }
  }

  await session.save();
  return session;
};

const getGroupSessions = async (groupId, startDate, endDate) => {
  const filter = { groupId };

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const sessions = await Attendance.find(filter)
    .sort({ date: -1 })
    .populate('records.studentId', 'userId')
    .populate({ path: 'records.studentId', populate: { path: 'userId', select: 'name surname' } });

  return sessions;
};

const getStudentAttendance = async (studentId, groupId) => {
  const filter = { 'records.studentId': studentId };
  if (groupId) filter.groupId = groupId;

  const sessions = await Attendance.find(filter)
    .sort({ date: -1 })
    .select('date groupId records');

  return sessions.map((session) => {
    const record = session.records.find(
      (r) => r.studentId.toString() === studentId
    );
    return {
      date: session.date,
      groupId: session.groupId,
      status: record ? record.status : 'absent',
      note: record ? record.note : '',
    };
  });
};

const getSessionById = async (sessionId) => {
  const session = await Attendance.findById(sessionId)
    .populate('groupId', 'name')
    .populate('teacherId', 'userId')
    .populate('records.studentId', 'userId')
    .populate({ path: 'records.studentId', populate: { path: 'userId', select: 'name surname' } });

  if (!session) {
    const error = new Error('Session not found');
    error.statusCode = 404;
    throw error;
  }

  return session;
};

module.exports = {
  createSession,
  markAttendance,
  getGroupSessions,
  getStudentAttendance,
  getSessionById,
};
