const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const controller = require('./analytics.controller');

router.get('/me', authenticate, roleCheck('student'), controller.getMyStats);
router.get('/groups/:groupId', authenticate, roleCheck('teacher'), controller.getGroupStats);
router.get('/platform', authenticate, roleCheck('admin'), controller.getPlatformStats);

module.exports = router;
