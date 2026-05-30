const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validation');
const chatController = require('./chat.controller');
const Joi = require('joi');

const sendMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required(),
});

// Bütün chat route-ları authentication tələb edir
router.use(authenticate);

router.get('/', chatController.getMyConversations);
router.get('/search', chatController.searchUsers);

router.post(
  '/user/:targetUserId',
  chatController.getOrCreateConversation
);

router.get(
  '/:conversationId',
  chatController.getMessages
);

router.post(
  '/:conversationId/messages',
  validate(sendMessageSchema),
  chatController.sendMessage
);

router.patch(
  '/:conversationId/read',
  chatController.markAsRead
);

module.exports = router;
