const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const validate = require('../../middleware/validation');
const { createSessionSchema, markAttendanceSchema } = require('./attendance.validation');
const controller = require('./attendance.controller');

router.post(
  '/sessions',
  authenticate,
  roleCheck('teacher'),
  validate(createSessionSchema),
  controller.createSession
);

router.patch(
  '/sessions/:sessionId',
  authenticate,
  roleCheck('teacher'),
  validate(markAttendanceSchema),
  controller.markAttendance
);

router.get(
  '/sessions/:sessionId',
  authenticate,
  controller.getSessionById
);

router.get(
  '/groups/:groupId',
  authenticate,
  controller.getGroupSessions
);

router.get(
  '/me',
  authenticate,
  roleCheck('student'),
  controller.getMyAttendance
);

module.exports = router;
