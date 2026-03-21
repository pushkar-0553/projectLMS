const pool = require('../config/db');

class Progress {
  static async createOrUpdate(userId, projectId, stepCompleted) {
    const [existing] = await pool.execute(
      'SELECT * FROM Progress WHERE user_id = ? AND project_id = ?',
      [userId, projectId]
    );

    if (existing.length > 0) {
      const [result] = await pool.execute(
        'UPDATE Progress SET step_completed = ? WHERE user_id = ? AND project_id = ?',
        [stepCompleted, userId, projectId]
      );
      return result.affectedRows > 0;
    } else {
      const [result] = await pool.execute(
        'INSERT INTO Progress (user_id, project_id, step_completed) VALUES (?, ?, ?)',
        [userId, projectId, stepCompleted]
      );
      return result.insertId;
    }
  }

  static async getUserProgress(userId, projectId) {
    const [rows] = await pool.execute(
      'SELECT * FROM Progress WHERE user_id = ? AND project_id = ?',
      [userId, projectId]
    );
    return rows[0];
  }

  static async getUserOverallProgress(userId) {
    const [rows] = await pool.execute(`
      SELECT 
        p.id as project_id,
        p.title as project_title,
        p.level,
        pr.step_completed,
        s.total_steps
      FROM Projects p
      LEFT JOIN Progress pr ON p.id = pr.project_id AND pr.user_id = ?
      LEFT JOIN (
        SELECT project_id, COUNT(*) as total_steps 
        FROM Steps 
        GROUP BY project_id
      ) s ON p.id = s.project_id
      ORDER BY p.level, p.id
    `, [userId]);
    return rows;
  }

  static async getCompletedProjectsCount(userId) {
    const [rows] = await pool.execute(`
      SELECT COUNT(*) as count FROM Progress pr
      JOIN Projects p ON pr.project_id = p.id
      JOIN Steps s ON p.id = s.project_id
      WHERE pr.user_id = ? AND pr.step_completed >= (
        SELECT COUNT(*) FROM Steps WHERE project_id = p.id
      )
    `, [userId]);
    return rows[0].count;
  }

  static async getCurrentActiveProject(userId) {
    const [rows] = await pool.execute(`
      SELECT p.*, pr.step_completed, s.total_steps
      FROM Projects p
      JOIN Progress pr ON p.id = pr.project_id
      JOIN (
        SELECT project_id, COUNT(*) as total_steps 
        FROM Steps 
        GROUP BY project_id
      ) s ON p.id = s.project_id
      WHERE pr.user_id = ? AND pr.step_completed < s.total_steps
      ORDER BY p.level, p.id
      LIMIT 1
    `, [userId]);
    return rows[0];
  }
}

module.exports = Progress;
