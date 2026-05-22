const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { checkRole } = require('../../middleware/roleCheck');
const { validate } = require('../../middleware/validation');
const inviteController = require('./invite.controller');
const Joi = require('joi');

const sendInviteSchema = Joi.object({
  studentId: Joi.string().hex().length(24).required(),
  courseId: Joi.string().hex().length(24).required(),
  message: Joi.string().max(500).allow('').default(''),
  discountCode: Joi.string().trim().allow(null, '').default(null),
  discountPercent: Joi.number().min(0).max(100).default(0),
});

const respondSchema = Joi.object({
  status: Joi.string().valid('accepted', 'declined').required(),
});

// Teacher routes
router.post(
  '/',
  authenticate,
  checkRole('teacher'),
  validate(sendInviteSchema),
  inviteController.sendInvite
);

router.get(
  '/sent',
  authenticate,
  checkRole('teacher'),
  inviteController.getSentInvites
);

// Student routes
router.get(
  '/my',
  authenticate,
  checkRole('student'),
  inviteController.getMyInvites
);

router.patch(
  '/:id/respond',
  authenticate,
  checkRole('student'),
  validate(respondSchema),
  inviteController.respondToInvite
);

module.exports = router;
