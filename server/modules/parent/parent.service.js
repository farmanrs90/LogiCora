const mongoose = require('mongoose');
const Parent = require('./parent.model');
const User = require('../user/user.model');
const Student = require('../student/student.model');
const Gamification = require('../gamification/gamification.model');
const Group = require('../group/group.model');
const Attendance = require('../attendance/attendance.model');
const Enrollment = require('../course/enrollment.model');
const Course = require('../course/course.model'); // eslint-disable-line no-unused-vars -- populate üçün model qeydiyyatı
const Teacher = require('../teacher/teacher.model');
const Competition = require('../competition/competition.model');
const TimeCapsule = require('./timeCapsule.model');

const LEAGUE_FALLBACK = 'bronze';

// ── Köməkçilər ───────────────────────────────────────────────────────────────
const getParentOrThrow = async (userId) => {
  const parent = await Parent.findOne({ userId });
  if (!parent) {
    const error = new Error('Parent profile not found');
    error.statusCode = 404;
    throw error;
  }
  return parent;
};

// :id = Student._id. Şagirdin User-i parentin children siyahısında olmalıdır.
const assertOwnsChild = async (userId, studentId) => {
  const parent = await getParentOrThrow(userId);
  const student = await Student.findById(studentId);
  if (!student) {
    const error = new Error('Şagird tapılmadı.');
    error.statusCode = 404;
    throw error;
  }
  const owns = (parent.children || []).some((cid) => String(cid) === String(student.userId));
  if (!owns) {
    const error = new Error('Bu şagird sizə aid deyil.');
    error.statusCode = 403;
    throw error;
  }
  return student;
};

const isSameDay = (d) => {
  if (!d) return false;
  const a = new Date(d);
  const b = new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

const relativeTime = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'İndicə';
  if (min < 60) return `${min} dəq əvvəl`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} saat əvvəl`;
  return `${Math.floor(hr / 24)} gün əvvəl`;
};

const computeMonthlyAttendance = async (studentId) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sessions = await Attendance.find({
    date: { $gte: monthStart },
    'records.studentId': studentId,
  }).sort({ date: 1 });

  let present = 0;
  let total = 0;
  let lastMissed = null;
  for (const sess of sessions) {
    const rec = sess.records.find((r) => String(r.studentId) === String(studentId));
    if (!rec) continue;
    total += 1;
    if (rec.status === 'present' || rec.status === 'late' || rec.status === 'excused') present += 1;
    else if (rec.status === 'absent') lastMissed = sess.date;
  }
  const result = { thisMonth: present, total };
  if (lastMissed) result.lastMissed = lastMissed;
  return result;
};

const ATT_STATUS_MAP = { present: 'present', late: 'distant', excused: 'none', absent: 'absent' };

const createParentProfile = async (userId, payload) => {
  const userExists = await User.findById(userId);
  if (!userExists) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const parentExists = await Parent.findOne({ userId });
  if (parentExists) {
    const error = new Error('Parent profile already exists');
    error.statusCode = 409;
    throw error;
  }

  const parent = await Parent.create({
    userId,
    ...payload,
  });

  return parent;
};

const getParentProfile = async (userId) => {
  const parent = await Parent.findOne({ userId })
    .populate('userId', 'name surname email phone')
    .populate('children', 'name email role');

  if (!parent) {
    const error = new Error('Parent profile not found');
    error.statusCode = 404;
    throw error;
  }

  return parent;
};

const updateParentProfile = async (userId, payload) => {
  const parent = await Parent.findOneAndUpdate(
    { userId },
    { $set: payload },
    { new: true, runValidators: true }
  ).populate('userId', 'name surname email phone');

  if (!parent) {
    const error = new Error('Parent profile not found');
    error.statusCode = 404;
    throw error;
  }

  return parent;
};

const deleteParentProfile = async (userId) => {
  const parent = await Parent.findOneAndDelete({ userId });
  if (!parent) {
    const error = new Error('Parent profile not found');
    error.statusCode = 404;
    throw error;
  }
  return parent;
};

const buildParentResponse = (parent, message) => {
  const response = parent.toObject ? parent.toObject() : parent;
  if (message) response.message = message;
  return response;
};

const getPopulatedParentWithChild = async (parentId, childUserId) => {
  const parent = await Parent.findOneAndUpdate(
    { _id: parentId },
    { $addToSet: { children: childUserId } },
    { new: true }
  ).populate('children', 'name surname email role');

  if (!parent) {
    const error = new Error('Parent profile not found');
    error.statusCode = 404;
    throw error;
  }
  return parent;
};

const resolveChildUser = async (parentUserId, childInput) => {
  const payload = childInput && typeof childInput === 'object'
    ? childInput
    : { childId: childInput };
  const childEmail = typeof payload.childEmail === 'string'
    ? payload.childEmail.trim().toLowerCase()
    : '';
  const childId = payload.childId;

  if (childEmail) {
    const childUser = await User.findOne({ email: childEmail }).select('_id name surname email role');
    if (!childUser) {
      const error = new Error('Child user not found');
      error.statusCode = 404;
      throw error;
    }
    if (String(childUser._id) === String(parentUserId)) {
      const error = new Error('Parent cannot link own account as child');
      error.statusCode = 400;
      throw error;
    }
    return childUser;
  }

  if (!childId) {
    const error = new Error('childEmail or childId is required');
    error.statusCode = 400;
    throw error;
  }
  if (!mongoose.Types.ObjectId.isValid(childId)) {
    const error = new Error('Invalid childId');
    error.statusCode = 400;
    throw error;
  }

  const childUser = await User.findById(childId).select('_id name surname email role');
  if (!childUser) {
    const error = new Error('Child user not found');
    error.statusCode = 404;
    throw error;
  }
  if (String(childUser._id) === String(parentUserId)) {
    const error = new Error('Parent cannot link own account as child');
    error.statusCode = 400;
    throw error;
  }
  return childUser;
};

const addChild = async (userId, childInput) => {
  const parent = await getParentOrThrow(userId);
  const childUser = await resolveChildUser(userId, childInput);
  if (childUser.role !== 'student') {
    const error = new Error('Child user must be a student');
    error.statusCode = 400;
    throw error;
  }

  const student = await Student.findOne({ userId: childUser._id }).select('_id parentId');
  if (!student) {
    const error = new Error('Student profile not found');
    error.statusCode = 404;
    throw error;
  }

  if (student.parentId && String(student.parentId) === String(parent._id)) {
    const updatedParent = await getPopulatedParentWithChild(parent._id, childUser._id);
    return buildParentResponse(updatedParent, 'Child already linked');
  }

  if (student.parentId) {
    const error = new Error('Child is already linked to another parent');
    error.statusCode = 409;
    throw error;
  }

  const claimedStudent = await Student.findOneAndUpdate(
    { _id: student._id, $or: [{ parentId: null }, { parentId: { $exists: false } }] },
    { $set: { parentId: parent._id } },
    { new: true }
  ).select('_id parentId');

  if (!claimedStudent) {
    const currentStudent = await Student.findById(student._id).select('parentId');
    if (currentStudent?.parentId && String(currentStudent.parentId) === String(parent._id)) {
      const updatedParent = await getPopulatedParentWithChild(parent._id, childUser._id);
      return buildParentResponse(updatedParent, 'Child already linked');
    }
    const error = new Error('Child is already linked to another parent');
    error.statusCode = 409;
    throw error;
  }

  const updatedParent = await getPopulatedParentWithChild(parent._id, childUser._id);
  return updatedParent;
};

const removeChild = async (userId, childId) => {
  const parentProfile = await getParentOrThrow(userId);
  let childUserIdToRemove = childId;
  let linkedStudent = null;

  if (mongoose.Types.ObjectId.isValid(childId)) {
    linkedStudent = await Student.findOne({
      parentId: parentProfile._id,
      $or: [{ userId: childId }, { _id: childId }],
    }).select('_id userId');

    if (linkedStudent?.userId) {
      childUserIdToRemove = linkedStudent.userId;
    }
  }

  const parent = await Parent.findOneAndUpdate(
    { _id: parentProfile._id },
    { $pull: { children: childUserIdToRemove } },
    { new: true }
  ).populate('children', 'name email');

  if (!parent) {
    const error = new Error('Parent profile not found');
    error.statusCode = 404;
    throw error;
  }

  if (linkedStudent) {
    await Student.updateOne(
      { _id: linkedStudent._id, parentId: parentProfile._id },
      { $unset: { parentId: '' } }
    );
  }

  return parent;
};
// ── Dashboard (read-only) servisləri ─────────────────────────────────────────

const getChildren = async (userId) => {
  const parent = await getParentOrThrow(userId);
  const childUserIds = parent.children || [];
  if (childUserIds.length === 0) return [];

  const students = await Student.find({ userId: { $in: childUserIds } })
    .populate('userId', 'name surname ageGroup');

  const results = [];
  for (const s of students) {
    const u = s.userId || {};
    const gamif = await Gamification.findOne({ studentId: s._id });
    results.push({
      id: String(s._id),
      name: [u.name, u.surname].filter(Boolean).join(' ') || 'Şagird',
      ageGroup: u.ageGroup || '',
      level: gamif?.level ?? 1,
      league: gamif?.leagueTier ?? LEAGUE_FALLBACK,
    });
  }
  return results;
};

const getChildStats = async (userId, studentId) => {
  const student = await assertOwnsChild(userId, studentId);
  const gamif = await Gamification.findOne({ studentId: student._id });
  const attendance = await computeMonthlyAttendance(student._id);

  let rank = 0;
  if (gamif) {
    const higher = await Gamification.countDocuments({ totalXP: { $gt: gamif.totalXP ?? 0 } });
    rank = higher + 1;
  }

  return {
    todayActive: isSameDay(gamif?.lastActivityDate),
    todayXP: 0,
    streak: gamif?.streak ?? 0,
    quizDone: false,
    attendance,
    level: gamif?.level ?? 1,
    league: gamif?.leagueTier ?? LEAGUE_FALLBACK,
    xpThisMonth: gamif?.weeklyXP ?? 0,
    totalXP: gamif?.totalXP ?? 0,
    rank,
    // location qəsdən buraxılır → frontend bunun yerinə "Milli Reyting" kartını göstərir
  };
};

const getWeeklyReport = async (userId) => {
  const parent = await getParentOrThrow(userId);
  const childUserIds = parent.children || [];
  if (childUserIds.length === 0) return { summary: 'Hələ uşaq əlavə olunmayıb.', bullets: [], subject: [] };

  const firstStudent = await Student.findOne({ userId: { $in: childUserIds } }).populate('userId', 'name');
  if (!firstStudent) return { summary: 'Şagird məlumatı tapılmadı.', bullets: [], subject: [] };

  const gamif = await Gamification.findOne({ studentId: firstStudent._id });
  const name = firstStudent.userId?.name || 'Övladınız';
  const weeklyXP = gamif?.weeklyXP ?? 0;
  const streak = gamif?.streak ?? 0;
  const badgeCount = gamif?.badges?.length ?? 0;
  const level = gamif?.level ?? 1;
  const league = gamif?.leagueTier ?? LEAGUE_FALLBACK;

  const bullets = [];
  if (streak > 0) bullets.push(`Cari seriya: ${streak} gün ardıcıl aktivlik.`);
  if (weeklyXP > 0) bullets.push(`Bu həftə toplanmış XP: ${weeklyXP}.`);
  if (badgeCount > 0) bullets.push(`Qazanılmış nişanların sayı: ${badgeCount}.`);

  return {
    summary: `${name} bu həftə ${weeklyXP} XP topladı və ${league} liqasında ${level}-ci səviyyədədir.`,
    bullets,
    subject: [],
  };
};

const getChildAttendance = async (userId, studentId) => {
  const student = await assertOwnsChild(userId, studentId);
  const sessions = await Attendance.find({ 'records.studentId': student._id })
    .sort({ date: -1 })
    .limit(30);
  sessions.reverse(); // köhnədən-yeniyə

  return sessions.map((sess) => {
    const rec = sess.records.find((r) => String(r.studentId) === String(student._id));
    return { date: sess.date, status: rec ? (ATT_STATUS_MAP[rec.status] || 'none') : 'none' };
  });
};

const getChildTeachers = async (userId, studentId) => {
  const student = await assertOwnsChild(userId, studentId);
  const groups = await Group.find({ studentIds: student._id });
  const teacherIds = [...new Set(groups.map((g) => String(g.teacherId)).filter(Boolean))];
  if (teacherIds.length === 0) return [];

  const teachers = await Teacher.find({ _id: { $in: teacherIds } }).populate('userId', 'name surname');
  return teachers.map((t) => {
    const u = t.userId || {};
    return {
      id: String(t._id),
      name: [u.name, u.surname].filter(Boolean).join(' ') || t.displayName || 'Müəllim',
      subject: t.specialization || 'Ümumi',
      unreadCount: 0,
      lastMessage: '',
    };
  });
};

const getPayments = async (userId) => {
  const parent = await getParentOrThrow(userId);
  const childUserIds = parent.children || [];
  if (childUserIds.length === 0) return [];

  const students = await Student.find({ userId: { $in: childUserIds } }).select('_id');
  const studentIds = students.map((s) => s._id);
  if (studentIds.length === 0) return [];

  const enrollments = await Enrollment.find({ studentId: { $in: studentIds } })
    .populate({ path: 'courseId', select: 'title price teacherId' })
    .sort({ enrolledAt: -1 })
    .limit(20);

  const results = [];
  for (const e of enrollments) {
    const course = e.courseId;
    if (!course) continue;
    let teacherName = 'Müəllim';
    if (course.teacherId) {
      const teacher = await Teacher.findById(course.teacherId).populate('userId', 'name surname');
      const u = teacher?.userId || {};
      teacherName = [u.name, u.surname].filter(Boolean).join(' ') || teacher?.displayName || 'Müəllim';
    }
    const amount = course.price ?? 0;
    results.push({
      id: String(e._id),
      courseName: course.title || 'Kurs',
      teacherName,
      amount,
      status: e.paymentId ? 'paid' : (amount > 0 ? 'pending' : 'paid'),
      date: e.enrolledAt,
    });
  }
  return results;
};

const getChildActivity = async (userId, studentId) => {
  const student = await assertOwnsChild(userId, studentId);
  const feed = [];

  const enrollments = await Enrollment.find({ studentId: student._id })
    .populate({ path: 'courseId', select: 'title' })
    .sort({ updatedAt: -1 })
    .limit(5);
  for (const e of enrollments) {
    const title = e.courseId?.title || 'Kurs';
    if (e.completedAt) {
      feed.push({ id: `enr-c-${e._id}`, icon: '🎓', text: `${title} kursunu tamamladı`, time: relativeTime(e.completedAt) });
    } else {
      feed.push({ id: `enr-${e._id}`, icon: '📚', text: `${title} kursuna qeydiyyatdan keçdi (${e.progress ?? 0}%)`, time: relativeTime(e.enrolledAt) });
    }
  }

  const gamif = await Gamification.findOne({ studentId: student._id });
  if (gamif) {
    if (gamif.streak > 0) {
      feed.push({ id: `streak-${student._id}`, icon: '🔥', text: `${gamif.streak} günlük aktivlik seriyası`, time: relativeTime(gamif.lastActivityDate) });
    }
    if ((gamif.badges?.length ?? 0) > 0) {
      feed.push({ id: `badge-${student._id}`, icon: '⭐', text: `${gamif.badges.length} nişan qazanıb`, time: '' });
    }
  }

  return feed;
};

// ChildProgress.tsx-in gözlədiyi TAM "FullProgress" shape-ini qaytarır.
// Bütün sahələr dolu olmalıdır — frontend render zamanı avgRank.toFixed() və
// bir neçə .map() çağırır, ona görə partial 200 cavabı ağ ekran riski yaradır.
const getChildProgress = async (userId, studentId) => {
  const student = await assertOwnsChild(userId, studentId); // parent ownership + 403/404
  const user = await User.findById(student.userId).select('name surname ageGroup');
  const gamif = await Gamification.findOne({ studentId: student._id });

  // ── Header ──
  const child = {
    id: String(student._id),
    name: [user?.name, user?.surname].filter(Boolean).join(' ') || 'Şagird',
    level: gamif?.level ?? 1,
    league: gamif?.leagueTier ?? LEAGUE_FALLBACK,
    ageGroup: user?.ageGroup || '',
  };

  // ── Davamiyyət (real) ──
  const sessions = await Attendance.find({ 'records.studentId': student._id })
    .sort({ date: -1 })
    .limit(30);
  sessions.reverse(); // köhnədən-yeniyə
  const attendance = sessions.map((sess) => {
    const rec = sess.records.find((r) => String(r.studentId) === String(student._id));
    return { date: sess.date, status: rec ? (ATT_STATUS_MAP[rec.status] || 'none') : 'none' };
  });
  const attendanceStats = { present: 0, absent: 0, distant: 0 };
  for (const a of attendance) {
    if (a.status === 'present') attendanceStats.present += 1;
    else if (a.status === 'absent') attendanceStats.absent += 1;
    else if (a.status === 'distant') attendanceStats.distant += 1;
  }
  const monthly = await computeMonthlyAttendance(student._id);
  const attendancePct = monthly.total > 0 ? Math.round((monthly.thisMonth / monthly.total) * 100) : 0;

  // ── Kurslar / enrollment (real) → courseProgress metriki + fənn analizi ──
  const enrollments = await Enrollment.find({ studentId: student._id })
    .populate({ path: 'courseId', select: 'title category' });
  let courseProgress = 0;
  if (enrollments.length > 0) {
    const sum = enrollments.reduce((acc, e) => acc + (e.progress || 0), 0);
    courseProgress = Math.round(sum / enrollments.length);
  }
  // Fənn (subject) — kurs kateqoriyalarına görə qruplaşdırılır, irəliləyiş = səviyyə
  const subjMap = new Map(); // category → { sum, count }
  for (const e of enrollments) {
    const cat = e.courseId?.category;
    if (!cat) continue;
    const cur = subjMap.get(cat) || { sum: 0, count: 0 };
    cur.sum += e.progress || 0;
    cur.count += 1;
    subjMap.set(cat, cur);
  }
  const subjects = [...subjMap.entries()].map(([subject, v]) => {
    const level = Math.round(v.sum / v.count);
    return { subject, level, trend: 0, radarValue: level, isWeak: level < 40 };
  });

  // ── Yarış nəticələri (real) ──
  const comps = await Competition.find({ 'participants.studentId': student._id })
    .sort({ finishedAt: -1, createdAt: -1 })
    .limit(10);
  const competitions = [];
  let rankSum = 0;
  let rankCount = 0;
  let best = null; // { rank, title }
  let accSum = 0;
  let accCount = 0;
  for (const c of comps) {
    const p = (c.participants || []).find((pt) => String(pt.studentId) === String(student._id));
    if (!p) continue;
    const rank = p.rank || 0;
    competitions.push({
      title: c.title || 'Yarış',
      rank,
      totalParticipants: (c.participants || []).length,
      score: p.score || 0,
      date: c.finishedAt || c.startedAt || c.createdAt,
    });
    if (rank > 0) {
      rankSum += rank;
      rankCount += 1;
      if (!best || rank < best.rank) best = { rank, title: c.title || 'Yarış' };
    }
    if (p.totalAnswers > 0) {
      accSum += (p.correctAnswers / p.totalAnswers) * 100;
      accCount += 1;
    }
  }
  const avgRank = rankCount > 0 ? Number((rankSum / rankCount).toFixed(1)) : 0;
  const bestResult = best ? `${best.rank}-ci yer — ${best.title}` : 'Hələ yarış nəticəsi yoxdur';
  const competitionRate = accCount > 0 ? Math.round(accSum / accCount) : 0;

  // ── Metrics ──
  const metrics = {
    // Gündəlik quiz tamamlama mənbəyi bu modullarda yoxdur → təhlükəsiz default
    quizCompletion: 0,
    attendance: attendancePct,
    competitionRate,
    courseProgress,
  };

  return {
    child,
    metrics,
    subjects,                 // real (kurs kateqoriyaları) və ya boş []
    mood: [],                 // mood izləmə modeli yoxdur → boş []
    moodAdvice: 'Əhval-ruhiyyə məlumatı hələ toplanmayıb.',
    attendance,               // real
    attendanceStats,          // real
    competitions,             // real və ya boş []
    avgRank,                  // həmişə number
    bestResult,
    careerSuggestions: [],    // AI analizi yazılmır → boş []
  };
};

// TimeCapsule sənədini frontend-in gözlədiyi shape-ə salır.
// "opened" minimal hesablanır: isOpened və ya openAt artıq keçibsə → açıq.
const mapCapsule = (doc) => ({
  id: String(doc._id),
  message: doc.message,
  openAt: doc.openAt,
  opened: doc.isOpened || new Date(doc.openAt).getTime() <= Date.now(),
});

const getTimeCapsules = async (userId) => {
  const parent = await getParentOrThrow(userId);
  const capsules = await TimeCapsule.find({ parentId: parent._id }).sort({ createdAt: -1 });
  return capsules.map(mapCapsule);
};

const createTimeCapsule = async (userId, payload) => {
  const parent = await getParentOrThrow(userId);
  const { childId, message, openAt } = payload || {};

  const trimmed = typeof message === 'string' ? message.trim() : '';
  if (!trimmed) {
    const error = new Error('Mesaj boş ola bilməz.');
    error.statusCode = 400;
    throw error;
  }
  if (!openAt || Number.isNaN(new Date(openAt).getTime())) {
    const error = new Error('Açılma tarixi düzgün deyil.');
    error.statusCode = 400;
    throw error;
  }
  if (!childId) {
    const error = new Error('Uşaq seçilməyib.');
    error.statusCode = 400;
    throw error;
  }

  // Parent ownership: childId = Student._id; parent yalnız öz uşağı üçün yarada bilər (403/404 atır).
  const student = await assertOwnsChild(userId, childId);

  const capsule = await TimeCapsule.create({
    parentId: parent._id,
    childId: student._id,
    message: trimmed,
    openAt: new Date(openAt),
    isOpened: false,
  });

  return mapCapsule(capsule);
};

// ── Bildiriş ayarları (Parent.notificationPreferences → { email, sms, instant }) ──
// Köhnə sənədlərdə field undefined ola bilər → "!== false" ilə default true qaytarılır.
const getNotificationPreferences = async (userId) => {
  const parent = await getParentOrThrow(userId);
  const prefs = parent.notificationPreferences || {};
  return {
    email: prefs.email !== false,
    sms: prefs.sms !== false,
    instant: prefs.instant !== false,
  };
};

const updateNotificationPreferences = async (userId, data) => {
  const parent = await getParentOrThrow(userId);
  const current = parent.notificationPreferences || {};
  const next = {
    email: typeof data.email === 'boolean' ? data.email : current.email !== false,
    sms: typeof data.sms === 'boolean' ? data.sms : current.sms !== false,
    instant: typeof data.instant === 'boolean' ? data.instant : current.instant !== false,
  };
  parent.notificationPreferences = next;
  await parent.save();
  return next;
};

module.exports = {
  createParentProfile,
  getParentProfile,
  updateParentProfile,
  deleteParentProfile,
  addChild,
  removeChild,
  getChildren,
  getChildStats,
  getWeeklyReport,
  getChildAttendance,
  getChildTeachers,
  getPayments,
  getChildActivity,
  getChildProgress,
  getTimeCapsules,
  createTimeCapsule,
  getNotificationPreferences,
  updateNotificationPreferences,
};







