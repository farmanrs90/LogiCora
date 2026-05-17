const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const validate = require('../../middleware/validation');
const { createCompetitionSchema, submitAnswerSchema } = require('./competition.validation');
const controller = require('./competition.controller');

router.post(
  '/',
  authenticate,
  roleCheck('teacher'),
  validate(createCompetitionSchema),
  controller.createCompetition
);

router.post(
  '/join/:pin',
  authenticate,
  roleCheck('student'),
  controller.joinCompetition
);

router.patch(
  '/:id/start',
  authenticate,
  roleCheck('teacher'),
  controller.startCompetition
);

router.post(
  '/:id/answers',
  authenticate,
  roleCheck('student'),
  validate(submitAnswerSchema),
  controller.submitAnswer
);

router.patch(
  '/:id/finish',
  authenticate,
  roleCheck('teacher'),
  controller.finishCompetition
);

router.get('/:id', authenticate, controller.getCompetition);

module.exports = router;
