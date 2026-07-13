const pool = require('../config/db');

class Activity {
  static async getAll() {
    const [rows] = await pool.execute(
      `SELECT al.*, u.name as user_name 
       FROM ActivityLogs al 
       JOIN Users u ON al.user_id = u.id 
       ORDER BY al.created_at DESC`
    );
    return rows;
  }

  static async getByCoordinator(coordinatorId) {
    const [rows] = await pool.execute(
      `SELECT al.*, u.name as user_name 
       FROM ActivityLogs al 
       JOIN Users u ON al.user_id = u.id 
       WHERE al.user_id = ? 
       ORDER BY al.created_at DESC`,
      [coordinatorId]
    );
    return rows;
  }
}

module.exports = Activity;
