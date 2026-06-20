const DailyQuestion = require('./dailyQuestion.model');
const Question = require('../question/question.model');
const Gamification = require('../gamification/gamification.model');
const Student = require('../student/student.model');
const { isFreezeActive } = require('../streakFreeze/streakFreeze.service');

const DAILY_LIMIT = 5;
const MAX_HEARTS = 5;

// Maps user ageGroup to question grade range
const AGE_GRADE_MAP = {
  '3-5':  { min: 1, max: 1 },
  '6-8':  { min: 1, max: 2 },
  '9-11': { min: 3, max: 5 },
  '12-14':{ min: 6, max: 8 },
  '15-17':{ min: 9, max: 10 },
  '18-22':{ min: 11, max: 12 },
  '23+':  { min: 10, max: 12 },
};

const DIFFICULTY_BY_KNOWLEDGE = {
  beginner: 'easy',
  intermediate: 'medium',
  advanced: 'hard',
};

const getTodayString = () => {
  const now = new Date();
  return now.toISOString().slice(0, 10); // "YYYY-MM-DD"
};

// Refill hearts to MAX if last refill was a different calendar day
const refillHeartsIfNeeded = async (profile) => {
  const today = getTodayString();
  const lastRefill = profile.heartsLastRefilled
    ? new Date(profile.heartsLastRefilled).toISOString().slice(0, 10)
    : null;

  if (lastRefill !== today) {
    profile.hearts = MAX_HEARTS;
    profile.heartsLastRefilled = new Date();
  }
};

const isDuplicateAnswerError = (error) => error && error.code === 11000;

const normalizeText = (value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw.trim().slice(0, 80) : '';
};

const uniqueTexts = (values = []) => {
  if (!Array.isArray(values)) return [];

  const seen = new Set();
  return values
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const rangesEqual = (a, b) => a.min === b.min && a.max === b.max;

const getPersonalizedGradeRange = (student, fallbackRange) => {
  const grade = Number(student && student.grade);

  if (
    Number.isInteger(grade) &&
    grade >= fallbackRange.min &&
    grade <= fallbackRange.max
  ) {
    return { min: grade, max: grade };
  }

  return fallbackRange;
};

const buildMatch = ({ answeredIds, gradeRange, subjects, difficulty }) => {
  const match = {
    _id: { $nin: answeredIds },
    grade: { $gte: gradeRange.min, $lte: gradeRange.max },
  };

  if (Array.isArray(subjects) && subjects.length > 0) {
    match.subject = { $in: subjects };
  }

  if (difficulty) {
    match.difficulty = difficulty;
  }

  return match;
};

const fetchDailyQuestionCandidates = async ({ answeredIds, remaining, gradeRange, subjects, difficulty }) => {
  const match = buildMatch({ answeredIds, gradeRange, subjects, difficulty });

  return Question.aggregate([
    { $match: match },
    { $sample: { size: remaining } },
    {
      $project: {
        text: 1,
        type: 1,
        options: 1,
        subject: 1,
        grade: 1,
        difficulty: 1,
        points: 1,
        tags: 1,
        // Never expose correctAnswer in GET
      },
    },
  ]);
};

const getDailyQuestions = async (user, filters = {}) => {
  const today = getTodayString();

  // Count how many questions the user has already answered today
  const answeredToday = await DailyQuestion.find({ userId: user._id, date: today }).select('questionId');
  const answeredIds = answeredToday.map((r) => r.questionId);

  if (answeredIds.length >= DAILY_LIMIT) {
    const error = new Error('Günlük limit dolub. Sabah davam edə bilərsiniz.');
    error.statusCode = 429;
    throw error;
  }

  const remaining = DAILY_LIMIT - answeredIds.length;
  const gradeRange = AGE_GRADE_MAP[user.ageGroup] || { min: 1, max: 12 };
  const student = await Student.findOne({ userId: user._id })
    .select('grade subjects knowledgeLevel')
    .lean();
  const personalizedGradeRange = getPersonalizedGradeRange(student, gradeRange);
  const requestedSubject = normalizeText(filters.subject);
  const profileSubjects = uniqueTexts(student && student.subjects);
  const subjectFilters = requestedSubject ? [requestedSubject] : profileSubjects;
  const preferredDifficulty = DIFFICULTY_BY_KNOWLEDGE[student && student.knowledgeLevel];

  const attempts = [];
  const seenAttempts = new Set();
  const addAttempt = ({ subjects, range, difficulty }) => {
    const key = JSON.stringify({
      subjects: subjects || [],
      min: range.min,
      max: range.max,
      difficulty: difficulty || null,
    });
    if (seenAttempts.has(key)) return;
    seenAttempts.add(key);
    attempts.push({ subjects, gradeRange: range, difficulty });
  };

  if (subjectFilters.length > 0 && preferredDifficulty) {
    addAttempt({ subjects: subjectFilters, range: personalizedGradeRange, difficulty: preferredDifficulty });
  }
  if (subjectFilters.length > 0) {
    addAttempt({ subjects: subjectFilters, range: personalizedGradeRange });
    if (!rangesEqual(personalizedGradeRange, gradeRange)) {
      addAttempt({ subjects: subjectFilters, range: gradeRange });
    }
  }
  if (subjectFilters.length === 0 && preferredDifficulty) {
    addAttempt({ range: personalizedGradeRange, difficulty: preferredDifficulty });
  }
  if (subjectFilters.length === 0 && !rangesEqual(personalizedGradeRange, gradeRange)) {
    addAttempt({ range: personalizedGradeRange });
  }
  addAttempt({ range: gradeRange });

  let questions = [];
  let appliedAttempt = null;
  for (const attempt of attempts) {
    questions = await fetchDailyQuestionCandidates({
      answeredIds,
      remaining,
      gradeRange: attempt.gradeRange,
      subjects: attempt.subjects,
      difficulty: attempt.difficulty,
    });

    if (questions.length > 0) {
      appliedAttempt = attempt;
      break;
    }
  }

  return {
    questions,
    answeredToday: answeredIds.length,
    remaining,
    dailyLimit: DAILY_LIMIT,
    personalization: {
      requestedSubject: requestedSubject || null,
      profileSubjects: subjectFilters,
      preferredDifficulty: preferredDifficulty || null,
      fallbackUsed: Boolean(
        appliedAttempt &&
        subjectFilters.length > 0 &&
        (!appliedAttempt.subjects || appliedAttempt.subjects.length === 0)
      ),
    },
  };
};

const submitAnswer = async (user, payload = {}) => {
  const { questionId, answer } = payload;

  if (!questionId) {
    const error = new Error('questionId tələb olunur.');
    error.statusCode = 400;
    throw error;
  }

  if (typeof answer !== 'string' || answer.trim().length === 0) {
    const error = new Error('Cavab boş ola bilməz.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedAnswer = answer.trim();
  const today = getTodayString();

  // Check if this question was already answered today
  const alreadyAnswered = await DailyQuestion.findOne({ userId: user._id, questionId, date: today });
  if (alreadyAnswered) {
    const error = new Error('Bu suala bu gün artıq cavab vermişsiniz.');
    error.statusCode = 400;
    throw error;
  }

  // Check daily limit
  const answeredCount = await DailyQuestion.countDocuments({ userId: user._id, date: today });
  if (answeredCount >= DAILY_LIMIT) {
    const error = new Error('Günlük limit dolub. Sabah davam edə bilərsiniz.');
    error.statusCode = 429;
    throw error;
  }

  const question = await Question.findById(questionId);
  if (!question) {
    const error = new Error('Sual tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const isCorrect = question.correctAnswer.trim().toLowerCase() === normalizedAnswer.toLowerCase();

  // Find student profile for this user (gamification uses studentId)
  const student = await Student.findOne({ userId: user._id });
  if (!student) {
    const error = new Error('Tələbə profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  let profile = await Gamification.findOne({ studentId: student._id });
  if (!profile) {
    profile = new Gamification({ studentId: student._id });
  }

  // Refill hearts at the start of a new day
  await refillHeartsIfNeeded(profile);

  if (profile.hearts <= 0) {
    const error = new Error('Ürəyiniz qalmayıb. Sabah yenidən cəhd edin.');
    error.statusCode = 400;
    throw error;
  }

  let xpEarned = 0;
  let heartLost = false;
  let newStreak = profile.streak;

  if (isCorrect) {
    // Update streak
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (profile.lastActivityDate) {
      const last = new Date(profile.lastActivityDate);
      last.setHours(0, 0, 0, 0);
      const diffDays = Math.round((todayDate - last) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day — streak already counted
      } else if (diffDays === 1) {
        profile.streak += 1;
      } else {
        const freezeActive = await isFreezeActive(student._id);
        profile.streak = freezeActive ? profile.streak : 1;
      }
    } else {
      profile.streak = 1;
    }

    profile.lastActivityDate = todayDate;
    newStreak = profile.streak;

    // XP = question points + streak bonus (5 per streak day, max 25)
    const streakBonus = Math.min(profile.streak * 5, 25);
    xpEarned = question.points + streakBonus;

    // Update weekly XP (reset if new week)
    const now = new Date();
    const currentWeekStart = getWeekStart();
    if (!profile.weekStart || profile.weekStart < currentWeekStart) {
      profile.weeklyXP = 0;
      profile.weekStart = currentWeekStart;
    }

    profile.totalXP += xpEarned;
    profile.weeklyXP += xpEarned;
    profile.level = getLevel(profile.totalXP);
    profile.leagueTier = getLeagueTier(profile.weeklyXP);
  } else {
    // Wrong answer — deduct one heart
    if (profile.hearts > 0) {
      profile.hearts -= 1;
      heartLost = true;
    }
  }

  // Save the daily question record
  let record;
  try {
    record = await DailyQuestion.create({
      userId: user._id,
      questionId,
      answeredAt: new Date(),
      isCorrect,
      xpEarned,
      date: today,
    });
  } catch (error) {
    if (isDuplicateAnswerError(error)) {
      const duplicateError = new Error('Bu suala bu gün artıq cavab vermişsiniz.');
      duplicateError.statusCode = 400;
      throw duplicateError;
    }
    throw error;
  }

  await profile.save();

  return {
    isCorrect,
    correctAnswer: question.correctAnswer,
    xpEarned,
    heartLost,
    heartsLeft: profile.hearts,
    streak: newStreak,
    totalXP: profile.totalXP,
    level: profile.level,
    record,
  };
};

// --- Helpers (duplicated locally to keep module self-contained) ---

const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];

const getLevel = (totalXP) => {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
};

const LEAGUE_TIERS = [
  { name: 'bronze',   min: 0 },
  { name: 'silver',   min: 200 },
  { name: 'gold',     min: 500 },
  { name: 'platinum', min: 1000 },
  { name: 'diamond',  min: 2000 },
];

const getLeagueTier = (weeklyXP) => {
  let tier = 'bronze';
  for (const league of LEAGUE_TIERS) {
    if (weeklyXP >= league.min) tier = league.name;
  }
  return tier;
};

const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};
// Returns today's progress for the daily quiz (used by the student dashboard card).
const getDailyStatus = async (user) => {
  const today = getTodayString();

  const records = await DailyQuestion.find({ userId: user._id, date: today });
  const answeredCount = records.length;
  const xpEarned = records.reduce((sum, r) => sum + (r.xpEarned || 0), 0);

  // Streak lives on the Gamification profile: User → Student → Gamification
  let streak = 0;
  const student = await Student.findOne({ userId: user._id });
  if (student) {
    const profile = await Gamification.findOne({ studentId: student._id });
    if (profile) streak = profile.streak;
  }

  return {
    completed: answeredCount >= DAILY_LIMIT,
    answeredCount,
    totalCount: DAILY_LIMIT,
    streak,
    xpEarned,
  };
};


module.exports = {
  getDailyQuestions,
  submitAnswer,
  getDailyStatus,
};
