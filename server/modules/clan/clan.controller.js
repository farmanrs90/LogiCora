const clanService = require('./clan.service');

const createClan = async (req, res) => {
  const clan = await clanService.createClan(req.user._id, req.body);
  res.status(201).json({ success: true, data: clan, message: 'Klan yaradıldı.' });
};

const joinClan = async (req, res) => {
  const clan = await clanService.joinClan(req.user._id, req.params.id);
  res.status(200).json({ success: true, data: clan, message: 'Klana qoşuldunuz.' });
};

const leaveClan = async (req, res) => {
  const result = await clanService.leaveClan(req.user._id);
  res.status(200).json({ success: true, data: result, message: 'Klandan çıxdınız.' });
};

const challengeClan = async (req, res) => {
  const battle = await clanService.challengeClan(req.user._id, req.params.id);
  res.status(201).json({ success: true, data: battle, message: 'Meydan oxundu.' });
};

const finishBattle = async (req, res) => {
  const battle = await clanService.finishBattle(
    req.params.battleId,
    req.body.challengerScore,
    req.body.challengedScore
  );
  res.status(200).json({ success: true, data: battle, message: 'Döyüş tamamlandı.' });
};

const getLeaderboard = async (req, res) => {
  const clans = await clanService.getLeaderboard(req.query);
  res.status(200).json({ success: true, data: clans, message: 'Leaderboard alındı.' });
};

const getClanBySlug = async (req, res) => {
  const clan = await clanService.getClanBySlug(req.params.slug);
  res.status(200).json({ success: true, data: clan, message: 'Klan alındı.' });
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
