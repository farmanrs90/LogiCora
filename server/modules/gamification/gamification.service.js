const Gamification = require('./gamification.model');
const XpHistory = require('./xpHistory.model');
const { BADGES } = require('./badges');

const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];

const LEAGUE_TIERS = [
  { name: 'bronze',   min: 0 },
  { name: 'silver',   min: 200 },
  { name: 'gold',     min: 500 },
  { name: 'platinum', min: 1000 },
  { name: 'diamond',  min: 2000 },
];

const getLevel = (totalXP) => {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
};

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

const updateStreak = (profile) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!profile.lastActivityDate) {
    profile.streak = 1;
    profile.lastActivityDate = today;
    return;
  }

  const last = new Date(profile.lastActivityDate);
  last.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today - last) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return;
  if (diffDays === 1) profile.streak += 1;
  if (diffDays > 1)  profile.streak = 1;

  profile.lastActivityDate = today;
};

const checkBadges = (profile, percentage, isFirstSubmission) => {
  const earned = [];
  const has = (id) => profile.badges.includes(id);

  if (isFirstSubmission && !has(BADGES.FIRST_STEP.id)) {
    earned.push(BADGES.FIRST_STEP.id);
  }
  if (percentage === 100 && !has(BADGES.PERFECT.id)) {
    earned.push(BADGES.PERFECT.id);
  }
  if (profile.streak >= 7 && !has(BADGES.STREAK_7.id)) {
    earned.push(BADGES.STREAK_7.id);
  }
  if (profile.streak >= 30 && !has(BADGES.STREAK_30.id)) {
    earned.push(BADGES.STREAK_30.id);
  }
  if (profile.totalXP >= 100 && !has(BADGES.CENTURY.id)) {
    earned.push(BADGES.CENTURY.id);
  }
  if (profile.totalXP >= 1000 && !has(BADGES.MASTER.id)) {
    earned.push(BADGES.MASTER.id);
  }
  if (profile.totalXP >= 5000 && !has(BADGES.LEGEND.id)) {
    earned.push(BADGES.LEGEND.id);
  }

  return earned;
};

const awardXP = async (studentId, { score, percentage, assessmentId, submissionCount }) => {
  let profile = await Gamification.findOne({ studentId });
  if (!profile) {
    profile = new Gamification({ studentId });
  }

  let multiplier = 0.5;
  if (percentage === 100) multiplier = 2;
  else if (percentage >= 80) multiplier = 1.5;
  else if (percentage >= 60) multiplier = 1;

  updateStreak(profile);

  const streakBonus = Math.min(profile.streak * 5, 50);
  const xpEarned = Math.round(score * multiplier) + streakBonus;

  const currentWeekStart = getWeekStart();
  if (!profile.weekStart || profile.weekStart < currentWeekStart) {
    profile.weeklyXP = 0;
    profile.weekStart = currentWeekStart;
  }

  profile.totalXP += xpEarned;
  profile.weeklyXP += xpEarned;
  profile.level = getLevel(profile.totalXP);
  profile.leagueTier = getLeagueTier(profile.weeklyXP);

  const isFirstSubmission = submissionCount === 1;
  const newBadges = checkBadges(profile, percentage, isFirstSubmission);
  if (newBadges.length > 0) {
    profile.badges.push(...newBadges);
  }

  await profile.save();

  await XpHistory.create({
    studentId,
    amount: xpEarned,
    reason: 'assessment',
    meta: { assessmentId, percentage, streakBonus },
  });

  return { xpEarned, newBadges, profile };
};

const getMyProfile = async (studentId) => {
  const profile = await Gamification.findOne({ studentId });
  if (!profile) {
    const error = new Error('Gamification profile not found');
    error.statusCode = 404;
    throw error;
  }
  return profile;
};

const getGroupLeaderboard = async (groupId) => {
  const Student = require('../student/student.model');
  const students = await Student.find({ enrolledGroups: groupId }).select('_id userId');
  const studentIds = students.map((s) => s._id);

  const leaderboard = await Gamification.find({ studentId: { $in: studentIds } })
    .sort({ totalXP: -1 })
    .limit(50)
    .populate('studentId', 'userId')
    .populate({ path: 'studentId', populate: { path: 'userId', select: 'name surname' } });

  return leaderboard;
};

const getNationalLeaderboard = async () => {
  const leaderboard = await Gamification.find()
    .sort({ totalXP: -1 })
    .limit(100)
    .populate({ path: 'studentId', populate: { path: 'userId', select: 'name surname' } });

  return leaderboard;
};

module.exports = {
  awardXP,
  getMyProfile,
  getGroupLeaderboard,
  getNationalLeaderboard,
};
