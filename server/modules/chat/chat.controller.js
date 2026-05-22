const chatService = require('./chat.service');

const getOrCreateConversation = async (req, res) => {
  const conversation = await chatService.getOrCreateConversation(
    req.user._id,
    req.params.targetUserId
  );
  res.status(200).json({ success: true, data: conversation, message: 'Söhbət alındı.' });
};

const sendMessage = async (req, res) => {
  const result = await chatService.sendMessage(
    req.user._id,
    req.params.conversationId,
    req.body.content
  );
  res.status(201).json({ success: true, data: result, message: 'Mesaj göndərildi.' });
};

const getMessages = async (req, res) => {
  const conversation = await chatService.getMessages(
    req.user._id,
    req.params.conversationId
  );
  res.status(200).json({ success: true, data: conversation, message: 'Mesajlar alındı.' });
};

const markAsRead = async (req, res) => {
  const conversation = await chatService.markAsRead(
    req.user._id,
    req.params.conversationId
  );
  res.status(200).json({ success: true, data: conversation, message: 'Mesajlar oxundu.' });
};

const getMyConversations = async (req, res) => {
  const conversations = await chatService.getMyConversations(req.user._id);
  res.status(200).json({ success: true, data: conversations, message: 'Söhbətlər alındı.' });
};

module.exports = {
  getOrCreateConversation,
  sendMessage,
  getMessages,
  markAsRead,
  getMyConversations,
};
