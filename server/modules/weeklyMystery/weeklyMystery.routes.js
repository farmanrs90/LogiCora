const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const controller = require('./weeklyMystery.controller');

router.get('/current', authenticate, controller.getCurrent);
router.get('/winners', authenticate, controller.getWinners);
router.get('/stats', authenticate, controller.getStats);
router.post('/answer', authenticate, controller.submitAnswer);

module.exports = router;
