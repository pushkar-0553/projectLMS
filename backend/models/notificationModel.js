const pool = require('../config/db');
const { emitNotification } = require('../socket');

class NotificationModel {
  static async createNotification(userId, title, message, type = 'general', link = null, senderId = null) {
    try {
      const query = `
        INSERT INTO Notifications (user_id, title, message, type, link, sender_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const [result] = await pool.execute(query, [userId, title, message, type, link, senderId]);
      
      const newNotification = {
        id: result.insertId,
        user_id: userId,
        title,
        message,
        type,
        link,
        sender_id: senderId,
        is_read: 0,
        created_at: new Date()
      };

      // Emit real-time notification
      emitNotification(userId, newNotification);

      return result.insertId;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  static async getUserNotifications(userId) {
    try {
      const query = `
        SELECT n.*, u.name as sender_name 
        FROM Notifications n
        LEFT JOIN Users u ON n.sender_id = u.id
        WHERE n.user_id = ? 
        ORDER BY n.is_read ASC, n.created_at DESC 
        LIMIT 50
      `;
      const [rows] = await pool.execute(query, [userId]);
      return rows;
    } catch (error) {
      console.error('Get notifications error:', error);
      throw error;
    }
  }

  static async markAsRead(notificationId, userId) {
    try {
      const query = `
        UPDATE Notifications 
        SET is_read = TRUE 
        WHERE id = ? AND user_id = ?
      `;
      const [result] = await pool.execute(query, [notificationId, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  }

  static async markAllAsRead(userId) {
    try {
      const query = `
        UPDATE Notifications 
        SET is_read = TRUE 
        WHERE user_id = ?
      `;
      const [result] = await pool.execute(query, [userId]);
      return result.affectedRows;
    } catch (error) {
      console.error('Mark all as read error:', error);
      throw error;
    }
  }

  static async delete(notificationId, userId) {
    try {
      const query = `
        DELETE FROM Notifications 
        WHERE id = ? AND user_id = ?
      `;
      const [result] = await pool.execute(query, [notificationId, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Delete notification error:', error);
      throw error;
    }
  }

  static async getUsersInBatch(batchId) {
    const [rows] = await pool.execute(
      'SELECT student_id as id FROM StudentBatchMap WHERE batch_id = ?',
      [batchId]
    );
    return rows;
  }

  static async getUsersInSubBatch(subBatchId) {
    const [rows] = await pool.execute(
      'SELECT id FROM Users WHERE sub_batch_id = ? AND role = "student"',
      [subBatchId]
    );
    return rows;
  }

  static async sendBulk(userIds, title, message, type, link, senderId) {
    for (const user of userIds) {
      const id = user.id || user;
      await this.createNotification(id, title, message, type, link, senderId);
    }
  }
}

module.exports = NotificationModel;
