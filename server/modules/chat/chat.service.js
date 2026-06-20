const Conversation = require('./conversation.model');
const User = require('../user/user.model');
const Group = require('../group/group.model');
const Parent = require('../parent/parent.model');
const Student = require('../student/student.model');
const Teacher = require('../teacher/teacher.model');

const addUserId = (set, value) => {
  if (value) set.add(value.toString());
};

const ALLOWED_TARGET_ROLES = {
  teacher: ['student', 'parent'],
  parent: ['teacher'],
  student: ['teacher', 'student'],
};

const getAllowedTargetRoles = (role) => ALLOWED_TARGET_ROLES[role] || [];

const getParentChildStudents = async (parent) => {
  if (!parent) return [];

  const filters = [{ parentId: parent._id }];
  if (parent.children?.length) {
    filters.push({ userId: { $in: parent.children } });
  }

  return Student.find({ $or: filters }).select('_id userId');
};

const getTeacherAllowedUserIds = async (userId) => {
  const teacher = await Teacher.findOne({ userId }).select('_id');
  if (!teacher) return [];

  const groups = await Group.find({ teacherId: teacher._id }).select('studentIds');
  const studentIds = groups.flatMap((group) => group.studentIds || []);
  if (studentIds.length === 0) return [];

  const allowed = new Set();
  const students = await Student.find({ _id: { $in: studentIds } }).select('userId parentId');
  const studentUserIds = [];
  const parentIds = [];

  students.forEach((student) => {
    addUserId(allowed, student.userId);
    if (student.userId) studentUserIds.push(student.userId);
    if (student.parentId) parentIds.push(student.parentId);
  });

  const parentQueries = [];
  if (parentIds.length) parentQueries.push({ _id: { $in: parentIds } });
  if (studentUserIds.length) parentQueries.push({ children: { $in: studentUserIds } });

  if (parentQueries.length) {
    const parents = await Parent.find({ $or: parentQueries }).select('userId');
    parents.forEach((parent) => addUserId(allowed, parent.userId));
  }

  return [...allowed];
};

const getParentAllowedUserIds = async (userId) => {
  const parent = await Parent.findOne({ userId }).select('_id children');
  const childStudents = await getParentChildStudents(parent);
  const childStudentIds = childStudents.map((student) => student._id);
  if (childStudentIds.length === 0) return [];

  const groups = await Group.find({ studentIds: { $in: childStudentIds } }).select('teacherId');
  const teacherIds = groups.map((group) => group.teacherId).filter(Boolean);
  if (teacherIds.length === 0) return [];

  const allowed = new Set();
  const teachers = await Teacher.find({ _id: { $in: teacherIds } }).select('userId');
  teachers.forEach((teacher) => addUserId(allowed, teacher.userId));

  return [...allowed];
};

const getStudentAllowedUserIds = async (userId) => {
  const student = await Student.findOne({ userId }).select('_id');
  if (!student) return [];

  const groups = await Group.find({ studentIds: student._id }).select('teacherId studentIds');
  if (groups.length === 0) return [];

  const allowed = new Set();
  const teacherIds = groups.map((group) => group.teacherId).filter(Boolean);
  const peerStudentIds = groups
    .flatMap((group) => group.studentIds || [])
    .filter((studentId) => studentId.toString() !== student._id.toString());

  if (teacherIds.length) {
    const teachers = await Teacher.find({ _id: { $in: teacherIds } }).select('userId');
    teachers.forEach((teacher) => addUserId(allowed, teacher.userId));
  }

  if (peerStudentIds.length) {
    const peers = await Student.find({ _id: { $in: peerStudentIds } }).select('userId');
    peers.forEach((peer) => addUserId(allowed, peer.userId));
  }

  return [...allowed];
};

const getAllowedTargetUserIds = async (userId, role) => {
  if (role === 'teacher') return getTeacherAllowedUserIds(userId);
  if (role === 'parent') return getParentAllowedUserIds(userId);
  if (role === 'student') return getStudentAllowedUserIds(userId);
  return [];
};

const canMessageUser = async (currentUser, targetUser) => {
  if (!currentUser || !targetUser) return false;
  if (currentUser._id.toString() === targetUser._id.toString()) return false;
  if (!getAllowedTargetRoles(currentUser.role).includes(targetUser.role)) return false;

  const allowedUserIds = await getAllowedTargetUserIds(currentUser._id, currentUser.role);
  return allowedUserIds.includes(targetUser._id.toString());
};

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

  if (!(await canMessageUser(currentUser, targetUser))) {
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

// Mesajlaşa biləcəyim əlaqəli istifadəçiləri axtar (ad / soyad / email)
const searchUsers = async (userId, query) => {
  const me = await User.findById(userId).select('role');
  if (!me) {
    const error = new Error('İstifadəçi tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const allowedUserIds = await getAllowedTargetUserIds(userId, me.role);
  const allowedRoles = getAllowedTargetRoles(me.role);
  if (allowedUserIds.length === 0 || allowedRoles.length === 0) return [];

  const filter = {
    _id: { $in: allowedUserIds, $ne: userId }, // yalnız real əlaqəli istifadəçilər
    role: { $in: allowedRoles },
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
