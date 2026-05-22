const Clan = require('./clan.model');
const ClanBattle = require('./clanBattle.model');
const Student = require('../student/student.model');
const Gamification = require('../gamification/gamification.model');

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');

const createClan = async (userId, { name, schoolName, emblem }) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    const error = new Error('Tələbə profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const existing = await Clan.findOne({ 'members.studentId': student._id });
  if (existing) {
    const error = new Error('Artıq bir klana üzvsünüz. Əvvəlcə klandan çıxın.');
    error.statusCode = 400;
    throw error;
  }

  const slug = slugify(name);
  const slugExists = await Clan.findOne({ slug });
  if (slugExists) {
    const error = new Error('Bu adda klan artıq mövcuddur.');
    error.statusCode = 400;
    throw error;
  }

  const clan = await Clan.create({
    name,
    slug,
    schoolName,
    emblem: emblem || null,
    createdBy: student._id,
    members: [{ studentId: student._id, role: 'leader', joinedAt: new Date() }],
  });

  return clan;
};

const joinClan = async (userId, clanId) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    const error = new Error('Tələbə profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const existing = await Clan.findOne({ 'members.studentId': student._id });
  if (existing) {
    const error = new Error('Artıq bir klana üzvsünüz.');
    error.statusCode = 400;
    throw error;
  }

  const clan = await Clan.findById(clanId);
  if (!clan) {
    const error = new Error('Klan tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  clan.members.push({ studentId: student._id, role: 'member', joinedAt: new Date() });

  const profile = await Gamification.findOne({ studentId: student._id });
  if (profile) {
    clan.totalXP += profile.totalXP;
  }

  await clan.save();
  return clan;
};

const leaveClan = async (userId) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    const error = new Error('Tələbə profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const clan = await Clan.findOne({ 'members.studentId': student._id });
  if (!clan) {
    const error = new Error('Heç bir klana üzv deyilsiniz.');
    error.statusCode = 404;
    throw error;
  }

  const member = clan.members.find(
    (m) => m.studentId.toString() === student._id.toString()
  );

  if (member.role === 'leader' && clan.members.length > 1) {
    const error = new Error('Lider klandan çıxa bilməz. Əvvəlcə lideri başqasına verin.');
    error.statusCode = 400;
    throw error;
  }

  clan.members = clan.members.filter(
    (m) => m.studentId.toString() !== student._id.toString()
  );

  const profile = await Gamification.findOne({ studentId: student._id });
  if (profile) {
    clan.totalXP = Math.max(0, clan.totalXP - profile.totalXP);
  }

  if (clan.members.length === 0) {
    await clan.deleteOne();
    return { message: 'Klan silindi (son üzv çıxdı).' };
  }

  await clan.save();
  return clan;
};

const challengeClan = async (userId, challengedClanId) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    const error = new Error('Tələbə profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const challengerClan = await Clan.findOne({
    members: { $elemMatch: { studentId: student._id, role: 'leader' } },
  });
  if (!challengerClan) {
    const error = new Error('Meydan oxumaq üçün klan lideri olmalısınız.');
    error.statusCode = 403;
    throw error;
  }

  if (challengerClan.activeBattle) {
    const error = new Error('Klanınızın aktiv döyüşü var. Əvvəlcə onu tamamlayın.');
    error.statusCode = 400;
    throw error;
  }

  if (challengerClan._id.toString() === challengedClanId.toString()) {
    const error = new Error('Öz klanınıza meydan oxuya bilməzsiniz.');
    error.statusCode = 400;
    throw error;
  }

  const challengedClan = await Clan.findById(challengedClanId);
  if (!challengedClan) {
    const error = new Error('Rəqib klan tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  if (challengedClan.activeBattle) {
    const error = new Error('Rəqib klanın aktiv döyüşü var.');
    error.statusCode = 400;
    throw error;
  }

  const battle = await ClanBattle.create({
    challengerId: challengerClan._id,
    challengedId: challengedClan._id,
    status: 'pending',
  });

  challengerClan.activeBattle = battle._id;
  challengedClan.activeBattle = battle._id;
  await challengerClan.save();
  await challengedClan.save();

  return battle;
};

const finishBattle = async (battleId, challengerScore, challengedScore) => {
  const battle = await ClanBattle.findById(battleId);
  if (!battle || battle.status !== 'active') {
    const error = new Error('Aktiv döyüş tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  battle.challengerScore = challengerScore;
  battle.challengedScore = challengedScore;
  battle.status = 'finished';
  battle.finishedAt = new Date();

  if (challengerScore > challengedScore) {
    battle.winner = battle.challengerId;
  } else if (challengedScore > challengerScore) {
    battle.winner = battle.challengedId;
  }

  await battle.save();

  const [challenger, challenged] = await Promise.all([
    Clan.findById(battle.challengerId),
    Clan.findById(battle.challengedId),
  ]);

  if (battle.winner) {
    const winnerId = battle.winner.toString();
    if (challenger._id.toString() === winnerId) {
      challenger.wins += 1;
      challenged.losses += 1;
    } else {
      challenged.wins += 1;
      challenger.losses += 1;
    }
  }

  challenger.activeBattle = null;
  challenged.activeBattle = null;
  await challenger.save();
  await challenged.save();

  return battle;
};

const getLeaderboard = async (filter = {}) => {
  const query = {};
  if (filter.schoolName) query.schoolName = filter.schoolName;

  const clans = await Clan.find(query)
    .sort({ totalXP: -1 })
    .limit(50)
    .select('name slug schoolName emblem totalXP weeklyXP wins losses members');

  return clans;
};

const getClanBySlug = async (slug) => {
  const clan = await Clan.findOne({ slug })
    .populate('members.studentId', 'userId grade')
    .populate('activeBattle');

  if (!clan) {
    const error = new Error('Klan tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  return clan;
};

module.exports = {
  createClan,
  joinClan,
  leaveClan,
  challengeClan,
  finishBattle,
  getLeaderboard,
  getClanBySlug,
};
