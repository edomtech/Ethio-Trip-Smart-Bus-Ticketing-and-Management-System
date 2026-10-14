const Notification = require('../models/Notification');

const getUserNotifications = async (userId) => {
  return Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(50);
};

const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({ _id: notificationId, user: userId });
  if (!notification) {
    const err = new Error('Notification not found');
    err.statusCode = 404;
    throw err;
  }
  notification.isRead = true;
  await notification.save();
  return notification;
};

const markAllAsRead = async (userId) => {
  await Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
  return { success: true, message: 'All notifications marked as read' };
};

const createNotification = async ({ user, companyId, type, title, message }) => {
  return Notification.create({
    user,
    companyId,
    type: type || 'general',
    title,
    message,
  });
};

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
};
