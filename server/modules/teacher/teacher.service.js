const Teacher = require('./teacher.model');
const User = require('../user/user.model');
const Group = require('../group/group.model');
const Student = require('../student/student.model');
const Course = require('../course/course.model');

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// "10 dəq əvvəl" formatında Azərbaycan dilində nisbi vaxt
const formatRelative = (date) => {
  if (!date) return 'Heç vaxt';
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'İndicə';
  if (min < 60) return `${min} dəq əvvəl`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} saat əvvəl`;
  const day = Math.floor(hr / 24);
  return `${day} gün əvvəl`;
};

// Login etmiş user-in Teacher sənədini tapır (yoxdursa 404)
const findTeacherByUser = async (userId) => {
  const teacher = await Teacher.findOne({ userId });
  if (!teacher) {
    const error = new Error('Teacher profile not found');
    error.statusCode = 404;
    throw error;
  }
  return teacher;
};

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

// ── Dashboard üçün real statistika ───────────────────────────────
const getMyStats = async (userId) => {
  const teacher = await findTeacherByUser(userId);
  const groups = await Group.find({ teacherId: teacher._id });
  const activeGroups = groups.filter((g) => g.status === 'active');

  const allStudents = new Set();
  groups.forEach((g) => g.studentIds.forEach((id) => allStudents.add(String(id))));

  const activeStudents = new Set();
  activeGroups.forEach((g) => g.studentIds.forEach((id) => activeStudents.add(String(id))));

  // Cədvəli (vaxtı) olan aktiv qruplar = bu həftəki dərslər
  const lessonsThisWeek = activeGroups.filter((g) => g.schedule && g.schedule.startTime).length;

  return {
    totalStudents: allStudents.size,
    newStudentsThisMonth: 0,        // mənbə yoxdur → 0
    studentTrend: [],               // mənbə yoxdur → boş
    revenueThisMonth: 0,            // ödəniş aqreqasiyası yoxdur → 0
    revenueTrend: [],               // mənbə yoxdur → boş
    impactScore: teacher.impactScore || 0,
    rating: teacher.rating || 0,
    activeGroups: activeGroups.length,
    activeStudentsInGroups: activeStudents.size,
    lessonsThisWeek,
  };
};

const getTodaySchedule = async (userId) => {
  const teacher = await findTeacherByUser(userId);
  const today = WEEKDAYS[new Date().getDay()];
  const groups = await Group.find({
    teacherId: teacher._id,
    status: 'active',
    'schedule.day': today,
  });

  const palette = ['#6366F1', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
  return groups.map((g, i) => ({
    id: String(g._id),
    title: g.name,
    groupName: g.name,
    groupColor: palette[i % palette.length],
    startTime: g.schedule?.startTime || '',
    endTime: g.schedule?.endTime || '',
  }));
};

const getMyStudents = async (userId) => {
  const teacher = await findTeacherByUser(userId);
  const groups = await Group.find({ teacherId: teacher._id }).select('studentIds');
  const ids = [...new Set(groups.flatMap((g) => g.studentIds.map(String)))];

  const students = await Student.find({ _id: { $in: ids } })
    .populate('userId', 'name surname lastLoginDate');

  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  return students.map((s) => {
    const u = s.userId || {};
    const last = u.lastLoginDate ? new Date(u.lastLoginDate).getTime() : null;
    const isWeak = !last || Date.now() - last > THREE_DAYS;
    return {
      id: String(s._id),
      name: [u.name, u.surname].filter(Boolean).join(' ') || 'Tələbə',
      lastSeen: formatRelative(u.lastLoginDate),
      xpChange: 0,            // dövri XP fərqi saxlanmır → 0
      isWeak,
    };
  });
};

const getMyCoursesPerformance = async (userId) => {
  const teacher = await findTeacherByUser(userId);
  const courses = await Course.find({ teacherId: teacher._id });

  return courses.map((c) => ({
    id: String(c._id),
    title: c.title,
    thumbnail: c.thumbnail || '',
    enrollCount: c.totalEnrolled || 0,
    completionPct: 0,         // tamamlama izlənmir → 0
    weeklyData: [],           // həftəlik qeydiyyat saxlanmır → boş
  }));
};

module.exports = {
  createTeacherProfile,
  getTeacherProfile,
  updateTeacherProfile,
  deleteTeacherProfile,
  getAllTeachers,
  addGroupToTeacher,
  removeGroupFromTeacher,
  getMyStats,
  getTodaySchedule,
  getMyStudents,
  getMyCoursesPerformance,
};