const Notification = require('../models/notification.model');

/**
 * Create and send a notification
 * @param {Object} io - Socket.io instance
 * @param {Object} params - Notification parameters
 * @param {String} params.recipient - ID of the user receiving the notification
 * @param {String} params.sender - ID of the user sending the notification (optional)
 * @param {String} params.type - Type of notification
 * @param {String} params.title - Notification title
 * @param {String} params.message - Notification message
 * @param {Object} params.data - Extra data (optional)
 */
const sendNotification = async (io, { recipient, sender, type, title, message, data }) => {
  try {
    // 1. Save to database
    const notification = new Notification({
      recipient,
      sender,
      type,
      title,
      message,
      data,
    });
    await notification.save();

    // 2. Emit socket event if user is connected
    // Users join a room with their userId in index.js
    if (io) {
      io.to(recipient.toString()).emit('new_notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

module.exports = { sendNotification };
