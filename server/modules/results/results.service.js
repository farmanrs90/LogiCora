const Student = require('../student/student.model');
const Teacher = require('../teacher/teacher.model');
const Parent = require('../parent/parent.model');
const Group = require('../group/group.model');
const Gamification = require('../gamification/gamification.model');
const DailyQuestion = require('../dailyQuestion/dailyQuestion.model');
const Competition = require('../competition/competition.model');
const Enrollment = require('../course/enrollment.model');

const forbidden = (message) => {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
};
const notFound = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

const studentUserId = (student) => {
  const u = student.userId;
  return u && typeof u === 'object' && u._id ? u._id : u;
};

// ── Tək tələbənin tam REAL nəticələri (uydurma yoxdur) ──────────────────────
const buildStudentResults = async (student) => {
  const userId = studentUserId(student);

  const [gam, dailyTotal, dailyCorrect, recentDaily, comps, enrolls] = await Promise.all([
    Gamification.findOne({ studentId: student._id }).lean(),
    DailyQuestion.countDocuments({ userId }),
    DailyQuestion.countDocuments({ userId, isCorrect: true }),
    DailyQuestion.find({ userId })
      .sort({ answeredAt: -1 })
      .limit(15)
      .populate('questionId', 'text subject')
      .lean(),
    Competition.find({ status: 'finished', 'participants.studentId': student._id })
      .sort({ finishedAt: -1 })
      .limit(15)
      .select('title finishedAt participants')
      .lean(),
    Enrollment.find({ studentId: student._id })
      .populate('courseId', 'title price')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
  ]);

  const competitions = comps.map((c) => {
    const p = (c.participants || []).find((pp) => String(pp.studentId) === String(student._id)) || {};
    return {
      id: c._id,
      title: c.title,
      finishedAt: c.finishedAt || null,
      score: p.score || 0,
      rank: p.rank || 0,
      correctAnswers: p.correctAnswers || 0,
      totalAnswers: p.totalAnswers || 0,
    };
  });

  const courses = enrolls.map((e) => ({
    id: e._id,
    courseTitle: (e.courseId && e.courseId.title) || null,
    progress: e.progress || 0,
    status: e.status || 'active',
    completedAt: e.completedAt || null,
  }));

  return {
    gamification: gam
      ? {
          totalXP: gam.totalXP || 0,
          level: gam.level || 1,
          streak: gam.streak || 0,
          leagueTier: gam.leagueTier || 'bronze',
          badges: Array.isArray(gam.badges) ? gam.badges : [],
        }
      : null,
    dailyQuiz: {
      totalAnswered: dailyTotal,
      correctAnswers: dailyCorrect,
      accuracy: dailyTotal > 0 ? Math.round((dailyCorrect / dailyTotal) * 100) : 0,
      recent: recentDaily.map((d) => ({
        id: d._id,
        questionText: (d.questionId && d.questionId.text) || null,
        subject: (d.questionId && d.questionId.subject) || null,
        isCorrect: !!d.isCorrect,
        xpEarned: d.xpEarned || 0,
        date: d.date || null,
        answeredAt: d.answeredAt || null,
      })),
    },
    competitions,
    courses,
  };
};

const studentLabel = (student, fallback = 'Tələbə') => {
  const u = student.userId && typeof student.userId === 'object' ? student.userId : {};
  return `${u.name || ''} ${u.surname || ''}`.trim() || fallback;
};

// ── /results/me — tələbə yalnız öz nəticələri ──────────────────────────────
const getMyResults = async (userId) => {
  const student = await Student.findOne({ userId }).populate('userId', 'name surname');
  if (!student) throw notFound('Tələbə profili tapılmadı.');
  const results = await buildStudentResults(student);
  return { student: { id: student._id, name: studentLabel(student) }, ...results };
};

// Müəllimin öz qruplarındakı tələbə id-ləri (əlaqə-scoped).
const getTeacherStudentIds = async (teacherUserId) => {
  const teacher = await Teacher.findOne({ userId: teacherUserId });
  if (!teacher) throw notFound('Müəllim profili tapılmadı.');
  const groups = await Group.find({ teacherId: teacher._id }).select('studentIds').lean();
  const ids = new Set();
  groups.forEach((g) => (g.studentIds || []).forEach((sid) => ids.add(String(sid))));
  return [...ids];
};

// ── /results/teacher — yalnız öz qruplarındakı tələbələrin xülasəsi ─────────
const getTeacherResults = async (teacherUserId) => {
  const studentIds = await getTeacherStudentIds(teacherUserId);
  if (studentIds.length === 0) return { students: [] };

  const [students, gams] = await Promise.all([
    Student.find({ _id: { $in: studentIds } }).populate('userId', 'name surname email').lean(),
    Gamification.find({ studentId: { $in: studentIds } }).lean(),
  ]);
  const gamMap = new Map(gams.map((g) => [String(g.studentId), g]));

  const summaries = await Promise.all(
    students.map(async (s) => {
      const uid = studentUserId(s);
      const [total, correct] = await Promise.all([
        DailyQuestion.countDocuments({ userId: uid }),
        DailyQuestion.countDocuments({ userId: uid, isCorrect: true }),
      ]);
      const g = gamMap.get(String(s._id));
      const u = s.userId || {};
      return {
        studentId: s._id,
        name: `${u.name || ''} ${u.surname || ''}`.trim() || 'Tələbə',
        email: u.email || null,
        totalXP: g ? g.totalXP || 0 : 0,
        level: g ? g.level || 1 : 1,
        quizAnswered: total,
        quizAccuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      };
    })
  );

  summaries.sort((a, b) => b.totalXP - a.totalXP);
  return { students: summaries };
};

// ── /results/student/:studentId — müəllim yalnız ÖZ qrupundakı tələbəni ─────
const getStudentResultsForTeacher = async (teacherUserId, studentId) => {
  const studentIds = await getTeacherStudentIds(teacherUserId);
  if (!studentIds.includes(String(studentId))) {
    throw forbidden('Bu tələbə sizin qruplarınızda deyil.');
  }
  const student = await Student.findById(studentId).populate('userId', 'name surname');
  if (!student) throw notFound('Tələbə profili tapılmadı.');
  const results = await buildStudentResults(student);
  return { student: { id: student._id, name: studentLabel(student) }, ...results };
};

// ── /results/parent/child/:childId — valideyn yalnız ÖZ övladını ───────────
const getChildResultsForParent = async (parentUserId, childId) => {
  const parent = await Parent.findOne({ userId: parentUserId });
  if (!parent) throw notFound('Valideyn profili tapılmadı.');

  // childId Student._id və ya birbaşa User._id ola bilər.
  let student = await Student.findById(childId).populate('userId', 'name surname');
  const childUserId = student ? studentUserId(student) : childId;

  const owns = (parent.children || []).some((cid) => String(cid) === String(childUserId));
  if (!owns) throw forbidden('Bu uşaq sizə aid deyil.');

  if (!student) {
    student = await Student.findOne({ userId: childUserId }).populate('userId', 'name surname');
  }
  if (!student) throw notFound('Övladın tələbə profili tapılmadı.');

  const results = await buildStudentResults(student);
  return { student: { id: student._id, name: studentLabel(student, 'Övlad') }, ...results };
};

module.exports = {
  getMyResults,
  getTeacherResults,
  getStudentResultsForTeacher,
  getChildResultsForParent,
};
