const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const controller = require('./kids.controller');

// VACİB: /videos/categories və /progress/me əvvəl, /videos/:id sonra olmalıdır
router.get('/videos/categories', authenticate, controller.getCategories);
router.get('/progress/me',       authenticate, controller.getMyProgress);

router.get('/videos',            authenticate, controller.getVideos);
router.get('/videos/:id',        authenticate, controller.getVideoById);

router.post('/videos/:id/view',     authenticate, controller.incrementView);
router.post('/videos/:id/complete', authenticate, controller.completeVideo);
router.post('/videos/:id/answer',   authenticate, controller.answerQuestion);

module.exports = router;
