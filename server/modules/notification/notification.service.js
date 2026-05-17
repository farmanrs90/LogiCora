const Notification = require('./notification.model');
const Student = require('../student/student.model');

const send = async ({ userId, type, title, message, meta = {} }) => {
  return Notification.create({ userId, type, title, message, meta });
};

const sendToStudent = async (studentId, { type, title, message, meta = {} }) => {
  const student = await Student.findById(studentId).select('userId parentId');
  if (!student) return;

  const notifications = [
    { userId: student.userId, type, title, message, meta },
  ];

  if (student.parentId) {
    const Parent = require('../parent/parent.model');
    const parent = await Parent.findById(student.parentId).select('userId');
    if (parent) {
      notifications.push({ userId: parent.userId, type, title, message, meta });
    }
  }

  await Notification.insertMany(notifications);
};

const getMyNotifications = async (userId, onlyUnread = false) => {
  const filter = { userId };
  if (onlyUnread) filter.isRead = false;

  return Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(50);
};

const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    const error = new Error('Notification not found');
    error.statusCode = 404;
    throw error;
  }

  return notification;
};

const markAllAsRead = async (userId) => {
  await Notification.updateMany({ userId, isRead: false }, { isRead: true });
};

const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ userId, isRead: false });
};

module.exports = {
  send,
  sendToStudent,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
