const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { checkRole } = require('../../middleware/roleCheck');
const { validate } = require('../../middleware/validation');
const clanController = require('./clan.controller');
const Joi = require('joi');

const createClanSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  schoolName: Joi.string().trim().min(2).max(100).required(),
  emblem: Joi.string().uri().allow(null, '').default(null),
});

const finishBattleSchema = Joi.object({
  challengerScore: Joi.number().min(0).required(),
  challengedScore: Joi.number().min(0).required(),
});

// Public routes
router.get('/leaderboard', clanController.getLeaderboard);
router.get('/:slug', clanController.getClanBySlug);

// Student routes
router.post(
  '/',
  authenticate,
  checkRole('student'),
  validate(createClanSchema),
  clanController.createClan
);

router.post(
  '/:id/join',
  authenticate,
  checkRole('student'),
  clanController.joinClan
);

router.delete(
  '/leave',
  authenticate,
  checkRole('student'),
  clanController.leaveClan
);

router.post(
  '/:id/challenge',
  authenticate,
  checkRole('student'),
  clanController.challengeClan
);

// Admin/system route — competition bitdikdə çağrılır
router.patch(
  '/battles/:battleId/finish',
  authenticate,
  checkRole('admin'),
  validate(finishBattleSchema),
  clanController.finishBattle
);

module.exports = router;
