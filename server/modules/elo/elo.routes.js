const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { checkRole } = require('../../middleware/roleCheck');
const { getMyElo, getLeaderboard } = require('./elo.service');

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const ratings = await getMyElo(req.user._id);
    res.status(200).json({ success: true, data: ratings, message: 'Reytinqlər alındı.' });
  } catch (err) {
    next(err);
  }
});

router.get('/leaderboard/:subject', async (req, res, next) => {
  try {
    const leaderboard = await getLeaderboard(req.params.subject);
    res.status(200).json({ success: true, data: leaderboard, message: 'Leaderboard alındı.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
