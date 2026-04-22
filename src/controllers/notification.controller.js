const Notification = require('../models/notification.model');

// Get all notifications for a user
exports.getUserNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('sender', 'username profile.profileImage')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.status(200).json({ notifications });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user.id },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (error) {
    next(error);
  }
};

// Mark all as read
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true }
    );
    
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// Delete a notification
exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    next(error);
  }
};
