const NotificationModel = require('../models/notificationModel');

const notificationController = {
  async getMyNotifications(req, res) {
    try {
      const notifications = await NotificationModel.getUserNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  },

  async markRead(req, res) {
    try {
      const { id } = req.params;
      await NotificationModel.markAsRead(id, req.user.id);
      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  },

  async markAllRead(req, res) {
    try {
      await NotificationModel.markAllAsRead(req.user.id);
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  },

  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      await NotificationModel.delete(id, req.user.id);
      res.json({ message: 'Notification deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  },

  // Issue #12 fix: Only admin/coordinator/faculty can create notifications
  async createNotification(req, res) {
    try {
      const userRole = req.user.role;
      if (!['admin', 'coordinator', 'faculty'].includes(userRole)) {
        return res.status(403).json({ error: 'Only admin, coordinators, and faculty can create notifications' });
      }

      const { user_id, title, message, type, link } = req.body;
      const id = await NotificationModel.createNotification(
        user_id,
        title,
        message,
        type,
        link,
        req.user.id
      );
      res.status(201).json({ id, message: 'Notification created' });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  },

  async sendManualNotification(req, res) {
    try {
      const { target_type, target_id, title, message, type = 'official', link } = req.body;
      const senderId = req.user.id;
      const senderRole = req.user.role;

      // Issue #10 fix: Allow admin to send manual notifications too
      if (senderRole !== 'coordinator' && senderRole !== 'faculty' && senderRole !== 'admin') {
        return res.status(403).json({ error: 'Only admin, coordinators, and faculty can send manual notifications' });
      }

      let recipients = [];
      if (target_type === 'individual') {
        recipients = [target_id];
      } else if (target_type === 'batch') {
        recipients = await NotificationModel.getUsersInBatch(target_id);
      } else if (target_type === 'sub-batch') {
        recipients = await NotificationModel.getUsersInSubBatch(target_id);
      }

      await NotificationModel.sendBulk(recipients, title, message, type, link, senderId);
      res.status(201).json({ message: 'Notifications sent successfully' });
    } catch (error) {
      console.error('Send manual notification error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
};

module.exports = notificationController;
