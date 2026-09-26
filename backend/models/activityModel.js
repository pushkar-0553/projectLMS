const pool = require('../config/db');

class Activity {
  static async getAll(limit = 50, offset = 0) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500));
    const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

    const [rows] = await pool.query(
      `SELECT al.*, u.name as user_name 
       FROM ActivityLogs al 
       JOIN Users u ON al.user_id = u.id 
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [safeLimit, safeOffset]
    );
    return rows;
  }

  static async getByCoordinator(coordinatorId, limit = 50, offset = 0) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500));
    const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

    const [rows] = await pool.query(
      `SELECT al.*, u.name as user_name 
       FROM ActivityLogs al 
       JOIN Users u ON al.user_id = u.id 
       WHERE al.user_id = ? 
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [coordinatorId, safeLimit, safeOffset]
    );
    return rows;
  }
}

module.exports = Activity;
