const Teacher = require('./teacher.model');
const User = require('../user/user.model');
const Group = require('../group/group.model');
const Student = require('../student/student.model');
const Course = require('../course/course.model');
const Enrollment = require('../course/enrollment.model');
const Gamification = require('../gamification/gamification.model');
const Attendance = require('../attendance/attendance.model');
const Invite = require('../invite/invite.model');

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

// ── Analitika səhifəsi üçün real data (TeacherAnalytics.tsx) ──
// Cavab birbaşa frontend-in gözlədiyi AnalyticsData shape-idir; saxlanmayan
// (vaxt seriyaları, trend, impact bölgüsü, AI mətni) sahələr boş/0 qaytarılır — fake yox.
// `period` qəbul olunur, lakin real data dövrə görə segmentlənmədiyi üçün filtrləmir.
const getMyAnalytics = async (userId, _period) => {
  const teacher = await findTeacherByUser(userId);

  const groups = await Group.find({ teacherId: teacher._id });
  const activeGroups = groups.filter((g) => g.status === 'active');
  const studentIds = [...new Set(groups.flatMap((g) => g.studentIds.map(String)))];
  const courses = await Course.find({ teacherId: teacher._id });

  // Storefront — Invite + Teacher sahələrindən real dəyərlər
  const [invitesSent, invitesAccepted] = await Promise.all([
    Invite.countDocuments({ teacherId: teacher._id }),
    Invite.countDocuments({ teacherId: teacher._id, status: 'accepted' }),
  ]);
  const featuredUntil = teacher.featuredUntil ? new Date(teacher.featuredUntil) : null;
  const featuredDaysLeft =
    teacher.isFeatured && featuredUntil && featuredUntil > new Date()
      ? Math.ceil((featuredUntil.getTime() - Date.now()) / 86400000)
      : undefined;
  const storefront = {
    profileViews: 0,                  // profil baxışı izlənmir → 0
    invitesSent,
    invitesAccepted,
    isFeatured: !!teacher.isFeatured,
    ...(featuredDaysLeft ? { featuredDaysLeft } : {}),
  };

  // Nə tələbə, nə kurs varsa → tam boş shape (frontend empty state göstərir, fake yox)
  if (studentIds.length === 0 && courses.length === 0) {
    return {
      metrics: [],
      groupXP: [],
      topStudents: [],
      weakStudents: [],
      courses: [],
      storefront,
      impactBreakdown: [],
      aiAdvice: '',
    };
  }

  // Real tələbə + gamification + davamiyyət
  const students = await Student.find({ _id: { $in: studentIds } })
    .populate('userId', 'name surname lastLoginDate');

  const gamRecords = await Gamification.find({ studentId: { $in: studentIds } });
  const gamMap = {};
  gamRecords.forEach((g) => { gamMap[String(g.studentId)] = g; });

  const attendance = await Attendance.find({ teacherId: teacher._id }).select('records');
  const attMap = {};
  attendance.forEach((a) => (a.records || []).forEach((r) => {
    const sid = String(r.studentId);
    if (!attMap[sid]) attMap[sid] = { attended: 0, total: 0 };
    attMap[sid].total += 1;
    if (r.status === 'present' || r.status === 'late') attMap[sid].attended += 1;
  }));
  const attendancePctOf = (sid) => {
    const m = attMap[sid];
    return m && m.total > 0 ? Math.round((m.attended / m.total) * 100) : 0;
  };

  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  const progress = students.map((s) => {
    const u = s.userId || {};
    const sid = String(s._id);
    const g = gamMap[sid];
    const lastTs = u.lastLoginDate ? new Date(u.lastLoginDate).getTime() : null;
    return {
      id: sid,
      name: [u.name, u.surname].filter(Boolean).join(' ') || 'Tələbə',
      xpGain: g ? (g.weeklyXP || 0) : 0,
      xpGainPct: 0,                   // dövri baza saxlanmır → 0
      lastSeen: formatRelative(u.lastLoginDate),
      attendancePct: attendancePctOf(sid),
      _totalXP: g ? (g.totalXP || 0) : 0,
      _isWeak: !lastTs || Date.now() - lastTs > THREE_DAYS,
    };
  });

  const strip = ({ _totalXP, _isWeak, ...rest }) => rest;
  const topStudents = progress
    .filter((p) => p.xpGain > 0)
    .sort((a, b) => (b.xpGain - a.xpGain) || (b._totalXP - a._totalXP))
    .slice(0, 5)
    .map(strip);
  const weakStudents = progress
    .filter((p) => p._isWeak)
    .slice(0, 5)
    .map(strip);

  // Real metriklər — dövri müqayisə saxlanmadığı üçün trend 0 (uydurma yox)
  const metrics = [
    { label: 'Tələbələr', value: String(studentIds.length), trend: 0, sub: 'cəmi' },
    { label: 'Aktiv qruplar', value: String(activeGroups.length), trend: 0, sub: 'hazırda' },
    { label: 'Kurslar', value: String(courses.length), trend: 0, sub: 'yaradılmış' },
    { label: 'Reytinq', value: (teacher.rating || 0).toFixed(1), trend: 0, sub: `${teacher.reviewCount || 0} rəy` },
  ];

  // Real kurs analitikası — vaxt seriyaları saxlanmır → boş massivlər (fake trend yox)
  const enrollments = await Enrollment.find({ courseId: { $in: courses.map((c) => c._id) } })
    .select('courseId progress completedAt');
  const enrByCourse = {};
  enrollments.forEach((e) => {
    const cid = String(e.courseId);
    (enrByCourse[cid] = enrByCourse[cid] || []).push(e);
  });
  const courseAnalytics = courses.map((c) => {
    const list = enrByCourse[String(c._id)] || [];
    const completedCount = list.filter((e) => e.completedAt || e.progress >= 100).length;
    const activeCount = list.filter((e) => !e.completedAt && e.progress > 0 && e.progress < 100).length;
    return {
      id: String(c._id),
      title: c.title,
      enrollCount: list.length || c.totalEnrolled || 0,
      activeCount,
      completedCount,
      avgRating: c.rating || 0,
      weeklyEnroll: [],               // həftəlik qeydiyyat saxlanmır → boş
      mostWatchedLesson: '—',         // dərs baxış statistikası yoxdur
      mostSkippedLesson: '—',         // dərs baxış statistikası yoxdur
      ratingTrend: [],                // reytinq tarixçəsi saxlanmır → boş
    };
  });

  return {
    metrics,
    groupXP: [],                      // qrup üzrə həftəlik XP tarixçəsi saxlanmır → boş
    topStudents,
    weakStudents,
    courses: courseAnalytics,
    storefront,
    impactBreakdown: [],              // impact komponent bölgüsü saxlanmır → boş
    aiAdvice: '',                     // AI mətni uydurulmur → boş
  };
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
  getMyAnalytics,
};