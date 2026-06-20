const Portfolio = require('./portfolio.model');
const Student = require('../student/student.model');
const User = require('../user/user.model');
const Parent = require('../parent/parent.model');
const Teacher = require('../teacher/teacher.model');
const Group = require('../group/group.model');
const Gamification = require('../gamification/gamification.model');
const crypto = require('crypto');

const generateShareableLink = () => crypto.randomBytes(10).toString('hex');

// ── Presentation maps & helpers (view-model üçün) ──────────────────────────────

// Backend badge id → frontend-in gözlədiyi ad/emoji/nadirlik (AZ)
const BADGE_PRESENTATION = {
  first_step: { name: 'İlk Addım',  emoji: '🌱', rarity: 'common',    description: 'İlk qiymətləndirmə tamamlandı' },
  perfect:    { name: 'Mükəmməl',   emoji: '💯', rarity: 'epic',      description: 'Bir testdə 100% nəticə' },
  streak_7:   { name: 'Alovlu',     emoji: '🔥', rarity: 'rare',      description: '7 gün ardıcıl' },
  streak_30:  { name: 'Dayanmaz',   emoji: '⚡', rarity: 'epic',      description: '30 gün ardıcıl' },
  century:    { name: 'Yüzlük',     emoji: '💪', rarity: 'common',    description: '100 XP qazanıldı' },
  master:     { name: 'Usta',       emoji: '🎓', rarity: 'rare',      description: '1000 XP qazanıldı' },
  legend:     { name: 'Əfsanə',     emoji: '👑', rarity: 'legendary', description: '5000 XP qazanıldı' },
};

// Fənn → peşə tövsiyəsi (Peşə Kompas — şagirdin ən güclü fənlərindən qurulur)
const SUBJECT_CAREER = {
  'Riyaziyyat':  { icon: '🤖', title: 'Süni İntellekt Mühəndisi', why: 'Riyaziyyatda güclü nəticələr',  skills: ['Riyaziyyat', 'İnformatika'] },
  'İnformatika': { icon: '💻', title: 'Proqram Mühəndisi',        why: 'İnformatikada güclü nəticələr', skills: ['İnformatika', 'Riyaziyyat'] },
  'Fizika':      { icon: '🛰️', title: 'Mühəndis / Fizik',         why: 'Fizikada güclü nəticələr',      skills: ['Fizika', 'Riyaziyyat'] },
  'Kimya':       { icon: '⚗️', title: 'Kimyaçı / Əczaçı',         why: 'Kimyada güclü nəticələr',       skills: ['Kimya', 'Biologiya'] },
  'Biologiya':   { icon: '🧬', title: 'Həkim / Bioloq',           why: 'Biologiyada güclü nəticələr',   skills: ['Biologiya', 'Kimya'] },
  'Tarix':       { icon: '⚖️', title: 'Hüquqşünas / Tarixçi',     why: 'Tarixdə güclü nəticələr',       skills: ['Tarix'] },
};

// Yarış timeline-ının mətnindən rəqəmləri çıxaran kiçik parserlər.
// description nümunəsi: "3-ci yer · 7/10 düzgün"
const parseRank = (desc = '') => {
  const m = desc.match(/(\d+)\s*-ci yer/);
  return m ? Number(m[1]) : 0;
};
const parseCorrectTotal = (desc = '') => {
  const m = desc.match(/(\d+)\s*\/\s*(\d+)\s*düzgün/);
  return m ? { correct: Number(m[1]), total: Number(m[2]) } : null;
};

// XP → 0-100 ustalıq faizi (UI-dakı bar üçün) və ulduz (0-5)
const masteryPct = (xp) => Math.min(100, Math.round(((xp || 0) / 2000) * 100));
const starsFrom  = (xp) => Math.min(5, Math.max(1, Math.ceil(masteryPct(xp) / 20)));

// ── Core ───────────────────────────────────────────────────────────────────────

const getOrCreatePortfolio = async (studentId) => {
  // Race-safe get or create with findOneAndUpdate (upsert)
  return await Portfolio.findOneAndUpdate(
    { studentId },
    { $setOnInsert: { studentId, shareableLink: generateShareableLink() } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

// Authenticated tələbənin Student profili yoxdursa (köhnə və ya yarımçıq qeydiyyat)
// onu real minimal profil kimi təmin et. FAKE DATA YOX — yalnız real user ↔ student
// bağlantısı (qeydiyyatdakı createRoleProfile ilə eyni: grade:1 + boş Gamification).
// Bu funksiyaya yalnız checkRole('student') keçən sorğular çatır, ona görə yaradılan
// profil həqiqətən mövcud tələbəyə aiddir. Upsert ilə race-safe-dir.
const getOrCreateStudentByUserId = async (userId) => {
  const student = await Student.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, grade: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Gamification yoxdursa onu da real boş halda yarat (digər endpointlər də 404 verməsin).
  await Gamification.findOneAndUpdate(
    { studentId: student._id },
    { $setOnInsert: { studentId: student._id } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return student;
};

// Xam Portfolio sənədini → frontend-in gözlədiyi zəngin view-model-ə çevirir.
// Bütün rəqəmlər real mənbədən gəlir; mənbəyi olmayanlar boş/hesablanmış qalır.
const buildViewModel = async (portfolio) => {
  if (!portfolio) throw new Error('Portfolio tapılmadı.');

  const studentId = portfolio.studentId?._id || portfolio.studentId;
  const student = await Student.findById(studentId);
  const user = student ? await User.findById(student.userId) : null;
  const game = await Gamification.findOne({ studentId });

  const totalXP = game ? (game.totalXP || 0) : 0;
  const level   = game ? (game.level || 1) : 1;
  const streak  = game ? (game.streak || 0) : 0;
  const league  = game ? (game.leagueTier || 'bronze') : 'bronze';

  // Milli sıra — bu şagirddən çox XP-yə malik şagirdlərin sayı + 1 (REAL)
  const rank = (await Gamification.countDocuments({ totalXP: { $gt: totalXP } })) + 1;

  // skillTree → skills
  const skills = (portfolio.skillTree || []).map((s) => ({
    subject: s.subject || 'Naməlum',
    xp: s.xp || 0,
    level: masteryPct(s.xp || 0),          // 0-100 (UI bar)
    stars: starsFrom(s.xp || 0),
    accuracy: 0,                       // fənn üzrə dəqiqlik hələ izlənmir
    questionsAnswered: 0,
    isWeak: false,
    isVerified: false,
    worlds: { unlocked: starsFrom(s.xp || 0), total: 5 },
  }));

  // timeline → frontend timeline + yarışlar + ümumi dəqiqlik/sual sayı
  let totalCorrect = 0;
  let totalQuestions = 0;
  const competitions = [];
  const TYPE_MAP = { achievement: 'milestone', attendance: 'milestone' };

  const timeline = (portfolio.timeline || [])
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((e) => {
      const rankN = e.type === 'competition' ? parseRank(e.description) : 0;
      if (e.type === 'competition') {
        const ct = parseCorrectTotal(e.description);
        if (ct) { totalCorrect += ct.correct; totalQuestions += ct.total; }
        competitions.push({
          id: String(e._id),
          title: e.title,
          rank: rankN,
          score: e.xpEarned || 0,
          totalParticipants: 0,        // iştirakçı sayı timeline-da saxlanmır
          date: e.date,
          subject: portfolio.topSubject || '',
        });
      }
      return {
        id: String(e._id),
        type: TYPE_MAP[e.type] || e.type,
        title: e.title,
        subtitle: e.description || undefined,
        date: e.date,
        meta: e.xpEarned ? `+${e.xpEarned} XP` : undefined,
        rank: rankN || undefined,
        badgeEmoji: e.type === 'badge' ? '🎖️' : undefined,
      };
    });

  const accuracy = totalQuestions > 0
    ? Math.round((totalCorrect / totalQuestions) * 100)
    : 0;

  // gamification.badges (id massivi) → zəngin nişan obyektləri
  const badges = (game && game.badges ? game.badges : []).map((bid) => {
    const p = BADGE_PRESENTATION[bid] || { name: bid, emoji: '🏅', rarity: 'common', description: '' };
    return { id: bid, ...p, earnedAt: game.updatedAt };
  });

  // Peşə Kompas — ən güclü 3 fəndən
  const careerSuggestions = [...skills]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 3)
    .map((s) => SUBJECT_CAREER[s.subject])
    .filter(Boolean);

  const fullName = `${user ? user.name : ''} ${user ? user.surname : ''}`.trim() || 'Tələbə';

  const aiBio =
    `${fullName} LogiCora-da indiyədək ${totalXP.toLocaleString('az-AZ')} XP toplayıb` +
    `${portfolio.topSubject ? `, ən güclü fənni ${portfolio.topSubject}` : ''}. ` +
    `${portfolio.totalCompetitions} yarışda iştirak edib` +
    `${streak > 0 ? `, cari seriyası ${streak} gündür` : ''}. ` +
    `Profil hər fəaliyyətlə avtomatik yenilənir.`;

  return {
    user: {
      id: String(user ? user._id : studentId),
      name: fullName,
      avatar: undefined,
      ageGroup: user ? user.ageGroup : '15-17',
      city: '',
      school: student ? student.school : '',
      bio: '',
      joinedAt: user ? user.createdAt : portfolio.createdAt,
      level,
      league,
    },
    stats: {
      totalXP,
      currentStreak: streak,
      longestStreak: streak,
      totalQuestions,
      accuracy,
      rank,
    },
    skills,
    badges,
    timeline,
    certificates: [],                  // kurs sertifikatları hələ bağlanmayıb
    competitions,
    careerSuggestions,
    aiBio,
    shareLink: `logicora.az/portfolio/${portfolio.shareableLink}`,
    isPublic: portfolio.isPublic,
    isConnected: false,
  };
};

const getMyPortfolio = async (userId) => {
  try {
    // Student profili yoxdursa generic xəta vermə — onu təmin et və real boş pasport qaytar.
    const student = await getOrCreateStudentByUserId(userId);
    const portfolio = await getOrCreatePortfolio(student._id);
    return await buildViewModel(portfolio);
  } catch (error) {
    console.error('Portfolio retrieval error:', error);
    throw error; // Let the controller/error handler catch it
  }
};

const parentCanViewStudent = async (viewerUserId, student) => {
  if (!student) return false;

  const parent = await Parent.findOne({ userId: viewerUserId }).select('_id children');
  if (!parent) return false;

  const linkedByProfile = student.parentId && String(student.parentId) === String(parent._id);
  const linkedByChildren = (parent.children || []).some(
    (childUserId) => String(childUserId) === String(student.userId)
  );

  return linkedByProfile || linkedByChildren;
};

const teacherCanViewStudent = async (viewerUserId, studentId) => {
  const teacher = await Teacher.findOne({ userId: viewerUserId }).select('_id');
  if (!teacher) return false;

  return Boolean(
    await Group.exists({
      teacherId: teacher._id,
      studentIds: studentId,
    })
  );
};

const getPortfolioByLink = async (shareableLink, viewer) => {
  const portfolio = await Portfolio.findOne({ shareableLink });
  if (!portfolio) {
    const error = new Error('Portfolio tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const ownerStudentId = portfolio.studentId.toString();
  const ownerStudent = await Student.findById(portfolio.studentId).select('userId parentId');

  // İcazə: public portfolio hamıya; private yalnız owner, bağlı parent/teacher və admin.
  const canSee = async () => {
    if (portfolio.isPublic) return true;
    if (!viewer) return false;
    if (viewer.role === 'admin') return true;
    if (viewer && viewer.role === 'student') {
      const s = await Student.findOne({ userId: viewer._id });
      if (s && s._id.toString() === ownerStudentId) return true;
    }
    if (viewer && viewer.role === 'parent') {
      return parentCanViewStudent(viewer._id, ownerStudent);
    }
    if (viewer && viewer.role === 'teacher') {
      return teacherCanViewStudent(viewer._id, portfolio.studentId);
    }
    return false;
  };

  if (!(await canSee())) {
    const error = new Error('Bu portfolio gizlidir.');
    error.statusCode = 403;
    throw error;
  }

  return buildViewModel(portfolio);
};

const updateVisibility = async (userId, isPublic) => {
  const student = await getOrCreateStudentByUserId(userId);
  const portfolio = await getOrCreatePortfolio(student._id);
  portfolio.isPublic = isPublic;
  await portfolio.save();
  return portfolio;
};

const addTimelineEntry = async (studentId, entry) => {
  const portfolio = await getOrCreatePortfolio(studentId);

  portfolio.timeline.push({
    date: entry.date || new Date(),
    type: entry.type,
    title: entry.title,
    description: entry.description || '',
    xpEarned: entry.xpEarned || 0,
    verified: entry.verified || false,
  });

  if (entry.type === 'course') portfolio.totalCourses += 1;
  if (entry.type === 'competition') portfolio.totalCompetitions += 1;

  if (portfolio.skillTree.length > 0) {
    const top = portfolio.skillTree.reduce((a, b) => ((a.xp || 0) >= (b.xp || 0) ? a : b));
    portfolio.topSubject = top.subject;
  }

  await portfolio.save();
  return portfolio;
};

const updateSkillTree = async (studentId, subject, xpToAdd) => {
  const portfolio = await getOrCreatePortfolio(studentId);

  const skill = portfolio.skillTree.find((s) => s.subject === subject);
  if (skill) {
    skill.xp += xpToAdd;
    skill.level = Math.floor(skill.xp / 200) + 1;
  } else {
    portfolio.skillTree.push({ subject, xp: xpToAdd, level: 1 });
  }

  if (portfolio.skillTree.length > 0) {
    const top = portfolio.skillTree.reduce((a, b) => ((a.xp || 0) >= (b.xp || 0) ? a : b));
    portfolio.topSubject = top.subject;
  }

  await portfolio.save();
  return portfolio;
};

const regenerateLink = async (userId) => {
  const student = await getOrCreateStudentByUserId(userId);
  const portfolio = await getOrCreatePortfolio(student._id);
  portfolio.shareableLink = generateShareableLink();
  await portfolio.save();
  return portfolio;
};

module.exports = {
  getMyPortfolio,
  getPortfolioByLink,
  updateVisibility,
  addTimelineEntry,
  updateSkillTree,
  regenerateLink,
};
