const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const controller = require('./gamification.controller');

router.get('/me', authenticate, controller.getMyProfile);
router.get('/badges', authenticate, controller.getAllBadges);
router.get('/leaderboard/group/:groupId', authenticate, controller.getGroupLeaderboard);
router.get('/leaderboard/national', authenticate, controller.getNationalLeaderboard);

module.exports = router;
