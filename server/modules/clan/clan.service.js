const Clan = require('./clan.model');
const ClanBattle = require('./clanBattle.model');
const Student = require('../student/student.model');
const Gamification = require('../gamification/gamification.model');
require('../user/user.model'); // populate('userId') üçün User model qeydiyyatı

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
  const challengerScoreValue = Number(challengerScore);
  const challengedScoreValue = Number(challengedScore);
  if (
    !Number.isFinite(challengerScoreValue) ||
    !Number.isFinite(challengedScoreValue) ||
    challengerScoreValue < 0 ||
    challengedScoreValue < 0
  ) {
    const error = new Error('Döyüş xalları düzgün deyil.');
    error.statusCode = 400;
    throw error;
  }

  const battle = await ClanBattle.findById(battleId);
  if (!battle) {
    const error = new Error('Aktiv döyüş tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  if (battle.status === 'finished') {
    const error = new Error('Döyüş artıq tamamlanıb.');
    error.statusCode = 400;
    throw error;
  }

  if (!['pending', 'active'].includes(battle.status)) {
    const error = new Error('Döyüş tamamlanmaq üçün uyğun statusda deyil.');
    error.statusCode = 400;
    throw error;
  }

  battle.challengerScore = challengerScoreValue;
  battle.challengedScore = challengedScoreValue;
  battle.status = 'finished';
  battle.finishedAt = new Date();

  if (challengerScoreValue > challengedScoreValue) {
    battle.winner = battle.challengerId;
  } else if (challengedScoreValue > challengerScoreValue) {
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

// İstifadəçinin öz klanı — membership Student._id ilə axtarılır.
// Klan yoxdursa null qaytarılır (frontend üçün ən təhlükəsiz: 200 + null).
const getMyClan = async (userId) => {
  const student = await Student.findOne({ userId });
  if (!student) return null;

  const clan = await Clan.findOne({ 'members.studentId': student._id })
    .populate('members.studentId', 'userId grade')
    .populate('activeBattle');

  return clan || null;
};

// ── Secondary clan data (members / battles / stats) ──────────────────────────
// Yalnız real data oxunur; saxlanmayan sahələr boş/default qaytarılır — fake yox.

const AVATAR_COLORS = ['#9333EA', '#3B82F6', '#06B6D4', '#F97316', '#EC4899', '#22C55E', '#EAB308', '#8B5CF6'];

// Göstərmə rəngi (id-dən deterministik) — saxta avatar deyil, sabit display rəngi.
const colorFor = (id) => {
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const getClanOrThrow = async (slug) => {
  const clan = await Clan.findOne({ slug });
  if (!clan) {
    const error = new Error('Klan tapılmadı.');
    error.statusCode = 404;
    throw error;
  }
  return clan;
};

// Clan üzvlərini real data ilə zənginləşdir (Student/User + Gamification). Yoxdursa [].
const buildMemberList = async (clan) => {
  const members = clan.members || [];
  if (members.length === 0) return [];

  const studentIds = members.map((m) => m.studentId).filter(Boolean);
  const [students, gamifs] = await Promise.all([
    Student.find({ _id: { $in: studentIds } }).populate('userId', 'name surname'),
    Gamification.find({ studentId: { $in: studentIds } }),
  ]);
  const studentMap = new Map(students.map((s) => [String(s._id), s]));
  const gamifMap = new Map(gamifs.map((g) => [String(g.studentId), g]));

  return members.map((m) => {
    const sid = String(m.studentId);
    const student = studentMap.get(sid);
    const u = student?.userId || {};
    const g = gamifMap.get(sid);
    return {
      studentId: sid,
      userId: u._id ? String(u._id) : '',
      name: u.name || 'Üzv',
      surname: u.surname || '',
      avatarColor: colorFor(sid),
      level: g?.level ?? 1,
      weeklyXP: g?.weeklyXP ?? 0,
      totalXP: g?.totalXP ?? 0,
      streak: g?.streak ?? 0,
      role: m.role || 'member',
      joinedAt: m.joinedAt,
    };
  });
};

const getClanMembers = async (slug) => {
  const clan = await getClanOrThrow(slug);
  return buildMemberList(clan);
};

const getClanBattles = async (slug) => {
  const clan = await getClanOrThrow(slug);

  const battles = await ClanBattle.find({
    $or: [{ challengerId: clan._id }, { challengedId: clan._id }],
  })
    .sort({ finishedAt: -1, createdAt: -1 })
    .limit(20)
    .populate('challengerId', 'name slug emblem')
    .populate('challengedId', 'name slug emblem');

  return battles.map((b) => {
    const challengerId = b.challengerId?._id ?? b.challengerId;
    const isChallenger = String(challengerId) === String(clan._id);
    const opponent = isChallenger ? b.challengedId : b.challengerId;
    const ourScore = isChallenger ? b.challengerScore : b.challengedScore;
    const theirScore = isChallenger ? b.challengedScore : b.challengerScore;

    let result = 'ongoing';
    if (b.status === 'finished') {
      if (b.winner && String(b.winner) === String(clan._id)) result = 'win';
      else if (b.winner) result = 'loss';
      else result = 'draw';
    }

    return {
      _id: String(b._id),
      opponentSlug: opponent?.slug || '',
      opponentName: opponent?.name || 'Rəqib',
      opponentColor: colorFor(opponent?._id || b._id),
      opponentEmoji: opponent?.emblem || '⚔️',
      ourScore: ourScore ?? 0,
      theirScore: theirScore ?? 0,
      result,
      subject: '',   // ClanBattle modelində saxlanmır
      format: '',    // ClanBattle modelində saxlanmır
      endedAt: b.finishedAt,
      startedAt: b.startedAt || b.createdAt,
    };
  });
};

const getClanStats = async (slug) => {
  const clan = await getClanOrThrow(slug);
  const memberList = await buildMemberList(clan);

  // memberXPShare — real üzv totalXP-ləri (top 4 + Digərləri)
  const byTotal = [...memberList].sort((a, b) => b.totalXP - a.totalXP);
  const top = byTotal.slice(0, 4);
  const rest = byTotal.slice(4);
  const memberXPShare = top.map((m) => ({ name: `${m.name} ${m.surname}`.trim(), xp: m.totalXP }));
  if (rest.length > 0) {
    memberXPShare.push({ name: 'Digərləri', xp: rest.reduce((s, m) => s + m.totalXP, 0) });
  }

  // mostActiveUser — bu həftə ən çox XP toplayan real üzv
  const mostActive = [...memberList].sort((a, b) => b.weeklyXP - a.weeklyXP)[0];
  const mostActiveUser = mostActive
    ? { name: `${mostActive.name} ${mostActive.surname}`.trim(), avatarColor: mostActive.avatarColor }
    : { name: '', avatarColor: AVATAR_COLORS[0] };

  // bestBattleScore — real bitmiş döyüşlərdə ən yüksək öz xalımız
  const finished = await ClanBattle.find({
    $or: [{ challengerId: clan._id }, { challengedId: clan._id }],
    status: 'finished',
  });
  let bestBattleScore = 0;
  for (const b of finished) {
    const our = String(b.challengerId) === String(clan._id) ? b.challengerScore : b.challengedScore;
    if ((our ?? 0) > bestBattleScore) bestBattleScore = our ?? 0;
  }

  return {
    weeklyXPHistory: [],   // həftəlik tarixi məlumat saxlanmır → boş (fake yox)
    memberXPShare,         // real
    strongestSubject: '',  // fənn analizi saxlanmır → default
    strongestPct: 0,
    mostActiveUser,        // real
    bestBattleScore,       // real
  };
};

module.exports = {
  createClan,
  joinClan,
  leaveClan,
  challengeClan,
  finishBattle,
  getLeaderboard,
  getClanBySlug,
  getMyClan,
  getClanMembers,
  getClanBattles,
  getClanStats,
};
