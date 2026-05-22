const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const controller = require('./notification.controller');

router.get('/', authenticate, controller.getMyNotifications);
router.get('/unread-count', authenticate, controller.getUnreadCount);
router.patch('/:id/read', authenticate, controller.markAsRead);
router.patch('/read-all', authenticate, controller.markAllAsRead);

module.exports = router;
