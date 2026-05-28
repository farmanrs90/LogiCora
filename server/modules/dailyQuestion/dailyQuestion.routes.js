const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const validate = require('../../middleware/validation');
const { submitAnswerSchema } = require('./dailyQuestion.validation');
const { getDaily, submitAnswer, getDailyStatus } = require('./dailyQuestion.controller');

// Only students can access daily questions
router.get('/', auth, roleCheck(['student']), getDaily);
router.get('/status', auth, roleCheck(['student']), getDailyStatus);
router.post('/answer', auth, roleCheck(['student']), validate(submitAnswerSchema), submitAnswer);

module.exports = router;
