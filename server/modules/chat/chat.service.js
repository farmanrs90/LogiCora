const Conversation = require('./conversation.model');
const User = require('../user/user.model');

const ALLOWED_PAIRS = [
  ['student', 'student'],
  ['teacher', 'parent'],
  ['teacher', 'student'],
];

const isPairAllowed = (role1, role2) =>
  ALLOWED_PAIRS.some(
    (pair) =>
      (pair[0] === role1 && pair[1] === role2) ||
      (pair[0] === role2 && pair[1] === role1)
  );

const getOrCreateConversation = async (userId, targetUserId) => {
  if (userId.toString() === targetUserId.toString()) {
    const error = new Error('Özünüzlə söhbət edə bilməzsiniz.');
    error.statusCode = 400;
    throw error;
  }

  const currentUser = await User.findById(userId).select('role');
  const targetUser = await User.findById(targetUserId).select('role');

  if (!currentUser || !targetUser) {
    const error = new Error('İstifadəçi tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  if (!isPairAllowed(currentUser.role, targetUser.role)) {
    const error = new Error(
      'Bu istifadəçi ilə söhbət etmək icazəsi yoxdur.'
    );
    error.statusCode = 403;
    throw error;
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [userId, targetUserId], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [userId, targetUserId],
    });
  }

  return conversation;
};

const sendMessage = async (senderId, conversationId, content) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: senderId,
  });

  if (!conversation) {
    const error = new Error('Söhbət tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const message = {
    senderId,
    content: content.trim(),
    sentAt: new Date(),
    readAt: null,
  };

  conversation.messages.push(message);
  conversation.lastMessage = content.trim().slice(0, 100);
  conversation.lastMessageAt = new Date();

  await conversation.save();

  const newMessage = conversation.messages[conversation.messages.length - 1];
  return { message: newMessage, conversationId: conversation._id };
};

const getMessages = async (userId, conversationId) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  }).populate('participants', 'name surname role');

  if (!conversation) {
    const error = new Error('Söhbət tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  return conversation;
};

const markAsRead = async (userId, conversationId) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    const error = new Error('Söhbət tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  conversation.messages.forEach((msg) => {
    if (msg.senderId.toString() !== userId.toString() && !msg.readAt) {
      msg.readAt = now;
    }
  });

  await conversation.save();
  return conversation;
};

const getMyConversations = async (userId) => {
  const conversations = await Conversation.find({ participants: userId })
    .populate('participants', 'name surname role')
    .select('participants lastMessage lastMessageAt')
    .sort({ lastMessageAt: -1 });

  return conversations;
};
// Cari rola görə mesajlaşmağa icazəli rolları çıxar (ALLOWED_PAIRS-dən)
const allowedTargetRoles = (role) => {
  const set = new Set();
  ALLOWED_PAIRS.forEach(([a, b]) => {
    if (a === role) set.add(b);
    if (b === role) set.add(a);
  });
  return [...set];
};

// Mesajlaşa biləcəyim istifadəçiləri axtar (ad / soyad / email)
const searchUsers = async (userId, query) => {
  const me = await User.findById(userId).select('role');
  if (!me) {
    const error = new Error('İstifadəçi tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const allowedRoles = allowedTargetRoles(me.role);
  if (allowedRoles.length === 0) return [];

  const filter = {
    _id:  { $ne: userId },          // özümü siyahıdan çıxar
    role: { $in: allowedRoles },    // yalnız icazəli rollar
  };

  const q = (query || '').trim();
  if (q) {
    const rx = new RegExp(q, 'i');  // 'i' = böyük/kiçik hərf fərqi yox
    filter.$or = [{ name: rx }, { surname: rx }, { email: rx }];
  }

  return User.find(filter).select('name surname role').limit(20);
};

module.exports = {
  getOrCreateConversation,
  sendMessage,
  getMessages,
  markAsRead,
  getMyConversations,
  searchUsers,
};
