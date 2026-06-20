const Group = require('./group.model');
const Teacher = require('../teacher/teacher.model');
const Student = require('../student/student.model');
const User = require('../user/user.model');
const Gamification = require('../gamification/gamification.model');
const Attendance = require('../attendance/attendance.model');

// ── Köməkçilər (ownership + frontend shape adapter) ──────────────────────────

const DAY_MAP_AZ_TO_EN = {
  'Bazar ertəsi': 'monday', 'Çərşənbə axşamı': 'tuesday', 'Çərşənbə': 'wednesday',
  'Cümə axşamı': 'thursday', 'Cümə': 'friday', 'Şənbə': 'saturday', 'Bazar': 'sunday',
};
const CARD_COLORS = ['#6366F1', '#8B5CF6', '#06B6D4', '#F59E0B', '#EC4899', '#10B981'];
const DEFAULT_MAX_MEMBERS = 30;
// Frontend status → Attendance enum (schema-da 'distant' yoxdur → present sayılır)
const ATT_STATUS_MAP = { present: 'present', absent: 'absent', late: 'late', distant: 'present' };

const getTeacherByUser = (userId) => Teacher.findOne({ userId });

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// İcazə: admin/manager hər qrupu, teacher YALNIZ öz qrupunu idarə edə bilər.
const assertCanManageGroup = async (user, groupId) => {
  const group = await Group.findById(groupId);
  if (!group) {
    const error = new Error('Qrup tapılmadı.');
    error.statusCode = 404;
    throw error;
  }
  if (user.role === 'teacher') {
    const teacher = await getTeacherByUser(user._id);
    if (!teacher || String(group.teacherId) !== String(teacher._id)) {
      const error = new Error('Bu qrup sizə aid deyil.');
      error.statusCode = 403;
      throw error;
    }
  }
  return group;
};

// Group sənədini frontend "card" shape-ə map et (schema-da olmayan sahələr default).
const mapGroupCard = (group, index = 0) => {
  const sch = group.schedule || {};
  return {
    id: String(group._id),
    name: group.name,
    color: CARD_COLORS[index % CARD_COLORS.length],
    subject: group.description || '',
    memberCount: (group.studentIds || []).length,
    maxMembers: DEFAULT_MAX_MEMBERS,
    isActive: (group.status || 'active') === 'active',
    attendancePct: 0,
    schedule: sch.day ? [{ day: sch.day, time: sch.startTime || '' }] : [],
  };
};

// Qrup üzvlərini real data ilə qur (ad/level/həftəlik XP/davamiyyət%). Yoxdursa [].
const buildMembers = async (group) => {
  const ids = (group.studentIds || []).map((s) => (s && s._id ? s._id : s));
  if (ids.length === 0) return [];

  const [students, gamifs, sessions] = await Promise.all([
    Student.find({ _id: { $in: ids } }).populate('userId', 'name surname'),
    Gamification.find({ studentId: { $in: ids } }),
    Attendance.find({ groupId: group._id }),
  ]);

  const gMap = new Map(gamifs.map((g) => [String(g.studentId), g]));
  const attMap = new Map();
  for (const sess of sessions) {
    for (const rec of sess.records || []) {
      const key = String(rec.studentId);
      const cur = attMap.get(key) || { present: 0, total: 0 };
      cur.total += 1;
      if (['present', 'late', 'excused'].includes(rec.status)) cur.present += 1;
      attMap.set(key, cur);
    }
  }

  return students.map((s) => {
    const u = s.userId || {};
    const g = gMap.get(String(s._id));
    const a = attMap.get(String(s._id));
    return {
      id: String(s._id),
      name: [u.name, u.surname].filter(Boolean).join(' ') || 'Tələbə',
      level: g?.level ?? 1,
      attendancePct: a && a.total > 0 ? Math.round((a.present / a.total) * 100) : 0,
      xpThisWeek: g?.weeklyXP ?? 0,
    };
  });
};

const createGroup = async (user, body) => {
  // teacherId: teacher → öz profilindən; admin/manager → body.teacherId
  let teacherId = body.teacherId;
  if (user.role === 'teacher') {
    const teacher = await getTeacherByUser(user._id);
    if (!teacher) {
      const error = new Error('Müəllim profili tapılmadı.');
      error.statusCode = 404;
      throw error;
    }
    teacherId = teacher._id;
  }
  if (!teacherId) {
    const error = new Error('teacherId tələb olunur.');
    error.statusCode = 400;
    throw error;
  }
  if (!body.name || !String(body.name).trim()) {
    const error = new Error('Qrup adı tələb olunur.');
    error.statusCode = 400;
    throw error;
  }

  const teacherExists = await Teacher.findById(teacherId);
  if (!teacherExists) {
    const error = new Error('Müəllim tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  // Frontend days[] (AZ) + time → schema tək schedule saxlayır; subject → description (ayrı sahə yoxdur).
  const days = Array.isArray(body.days) ? body.days : [];
  const schedule = days.length > 0
    ? { day: DAY_MAP_AZ_TO_EN[days[0]] || 'monday', startTime: body.time || '', endTime: body.time || '' }
    : undefined;

  const payload = {
    name: String(body.name).trim(),
    teacherId,
    description: body.subject || body.description || '',
    ...(schedule ? { schedule } : {}),
  };
  if (user.role !== 'teacher' && Array.isArray(body.studentIds)) {
    payload.studentIds = body.studentIds;
  }

  const group = await Group.create(payload);
  return group;
};

const getAllGroups = async (user) => {
  const filter = {};
  if (user.role === 'teacher') {
    const teacher = await getTeacherByUser(user._id);
    if (!teacher) return [];
    filter.teacherId = teacher._id;
  }
  const groups = await Group.find(filter).sort({ createdAt: -1 });
  return groups.map((g, i) => mapGroupCard(g, i));
};

const getGroupById = async (user, groupId) => {
  const group = await assertCanManageGroup(user, groupId);
  const members = await buildMembers(group);
  return {
    ...mapGroupCard(group),
    members,
    attendanceDays: [],
    competitions: [],
    analytics: { xpTrend: [], subjectBreakdown: [], topStudent: null, weakStudent: null, monthlyAttendance: [] },
  };
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

const addStudentToGroup = async (user, groupId, studentId) => {
  await assertCanManageGroup(user, groupId);
  if (user.role === 'teacher') {
    throw createError('Tələbə əlavə etmə yalnız təsdiqlənmiş əlaqə ilə mümkündür.', 403);
  }
  const studentExists = await Student.findById(studentId);
  if (!studentExists) {
    const error = new Error('Tələbə tapılmadı.');
    error.statusCode = 404;
    throw error;
  }
  const group = await Group.findByIdAndUpdate(
    groupId,
    { $addToSet: { studentIds: studentId } },
    { new: true }
  );
  return group;
};

// Email ilə dəvət — User → Student tapılır, sonra qrupa əlavə olunur (fake yox, real).
const inviteStudentByEmail = async (user, groupId, email) => {
  await assertCanManageGroup(user, groupId);
  if (user.role === 'teacher') {
    throw createError('Dəvət sistemi post-demo mərhələsində aktivləşdiriləcək.', 501);
  }
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) {
    const error = new Error('Email tələb olunur.');
    error.statusCode = 400;
    throw error;
  }
  const account = await User.findOne({ email: normalized });
  if (!account) {
    const error = new Error('Bu email ilə istifadəçi tapılmadı.');
    error.statusCode = 404;
    throw error;
  }
  const student = await Student.findOne({ userId: account._id });
  if (!student) {
    const error = new Error('Bu istifadəçi tələbə deyil.');
    error.statusCode = 400;
    throw error;
  }
  const group = await Group.findByIdAndUpdate(
    groupId,
    { $addToSet: { studentIds: student._id } },
    { new: true }
  );
  return group;
};

const removeStudentFromGroup = async (user, groupId, studentId) => {
  await assertCanManageGroup(user, groupId);
  const group = await Group.findByIdAndUpdate(
    groupId,
    { $pull: { studentIds: studentId } },
    { new: true }
  );
  if (!group) {
    const error = new Error('Qrup tapılmadı.');
    error.statusCode = 404;
    throw error;
  }
  return group;
};

// Davamiyyət saxla — mövcud Attendance modeli, (groupId, date) unikal → upsert (schema dəyişmir).
const saveGroupAttendance = async (user, groupId, body) => {
  const group = await assertCanManageGroup(user, groupId);
  const raw = body.date ? new Date(body.date) : new Date();
  if (Number.isNaN(raw.getTime())) {
    const error = new Error('Tarix düzgün deyil.');
    error.statusCode = 400;
    throw error;
  }
  // gün başlanğıcına normallaşdır ki, (groupId, date) unikal indeksi gün üzrə işləsin
  const date = new Date(Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate()));

  const records = (Array.isArray(body.records) ? body.records : []).map((r) => ({
    studentId: r.userId,
    status: ATT_STATUS_MAP[r.status] || 'absent',
  }));

  const attendance = await Attendance.findOneAndUpdate(
    { groupId: group._id, date },
    { $set: { teacherId: group.teacherId, records } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return attendance;
};

module.exports = {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addStudentToGroup,
  removeStudentFromGroup,
  inviteStudentByEmail,
  saveGroupAttendance,
};
