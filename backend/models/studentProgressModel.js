const pool = require('../config/db');

class StudentProgress {
  static async create(userId, projectId, stepId) {
    const [result] = await pool.execute(
      `INSERT INTO StudentProgress (user_id, project_id, step_id, status) 
       VALUES (?, ?, ?, 'pending') 
       ON DUPLICATE KEY UPDATE status = 'pending', submitted_at = CURRENT_TIMESTAMP, feedback = NULL`,
      [userId, projectId, stepId]
    );
    return result.insertId;
  }

  static async updateStatus(progressId, status, reviewerId = null, feedback = null) {
    const [result] = await pool.execute(
      `UPDATE StudentProgress 
       SET status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewer_id = ?, feedback = ?
       WHERE id = ?`,
      [status, reviewerId, feedback, progressId]
    );
    return result.affectedRows > 0;
  }

  static async findByUserAndStep(userId, stepId) {
    const [rows] = await pool.execute(
      'SELECT * FROM StudentProgress WHERE user_id = ? AND step_id = ?',
      [userId, stepId]
    );
    return rows[0];
  }

  static async getUserProgress(userId, projectId = null) {
    let query = `
      SELECT sp.*, p.title as project_title, p.type as project_type, 
             s.title as step_title, s.step_order
      FROM StudentProgress sp
      JOIN Projects p ON sp.project_id = p.id
      JOIN Steps s ON sp.step_id = s.id
      WHERE sp.user_id = ?
    `;
    const params = [userId];
    
    if (projectId) {
      query += ' AND sp.project_id = ?';
      params.push(projectId);
    }
    
    query += ' ORDER BY sp.project_id, s.step_order';
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async getPendingApprovals() {
    const [rows] = await pool.execute(
      `SELECT sp.*, u.name as student_name, u.email as student_email,
              p.title as project_title, p.level, p.type as project_type,
              s.title as step_title, s.step_order
       FROM StudentProgress sp
       JOIN Users u ON sp.user_id = u.id
       JOIN Projects p ON sp.project_id = p.id
       JOIN Steps s ON sp.step_id = s.id
       WHERE sp.status = 'pending'
       ORDER BY sp.submitted_at ASC`
    );
    return rows;
  }

  static async getStudentProgressForReviewer(reviewerId) {
    const [rows] = await pool.execute(
      `SELECT sp.*, u.name as student_name, u.email as student_email,
              p.title as project_title, p.level, p.type as project_type,
              s.title as step_title, s.step_order
       FROM StudentProgress sp
       JOIN Users u ON sp.user_id = u.id
       JOIN Projects p ON sp.project_id = p.id
       JOIN Steps s ON sp.step_id = s.id
       WHERE sp.status = 'pending'
       ORDER BY sp.submitted_at ASC`
    );
    return rows;
  }

  static async getCurrentStep(userId, projectId) {
    const [rows] = await pool.execute(
      `SELECT sp.*, s.step_order
       FROM StudentProgress sp
       JOIN Steps s ON sp.step_id = s.id
       WHERE sp.user_id = ? AND sp.project_id = ? AND sp.status != 'approved'
       ORDER BY s.step_order ASC
       LIMIT 1`,
      [userId, projectId]
    );
    return rows[0];
  }

  static async getNextAvailableStep(userId, projectId) {
    const [rows] = await pool.execute(
      `SELECT s.*
       FROM Steps s
       WHERE s.project_id = ?
       AND s.id NOT IN (
         SELECT sp.step_id 
         FROM StudentProgress sp 
         WHERE sp.user_id = ? AND sp.project_id = ? AND sp.status = 'approved'
       )
       ORDER BY s.step_order ASC
       LIMIT 1`,
      [projectId, userId, projectId]
    );
    return rows[0];
  }

  static async getStudentStats(userId) {
    const [rows] = await pool.execute(
      `SELECT 
         COUNT(CASE WHEN sp.status = 'approved' THEN 1 END) as approved_steps,
         COUNT(CASE WHEN sp.status = 'pending' THEN 1 END) as pending_steps,
         COUNT(CASE WHEN sp.status = 'rejected' THEN 1 END) as rejected_steps,
         COUNT(DISTINCT sp.project_id) as projects_started
       FROM StudentProgress sp
       WHERE sp.user_id = ?`,
      [userId]
    );
    return rows[0];
  }

  static async getStudentProjectSummary(userId) {
    const [rows] = await pool.execute(
      `SELECT 
         p.id as project_id,
         p.title as project_title,
         p.type as project_type,
         p.level,
         COUNT(s.id) as total_steps,
         COUNT(CASE WHEN sp.status = 'approved' THEN 1 END) as approved_steps,
         COUNT(CASE WHEN sp.status = 'pending' THEN 1 END) as pending_steps,
         COUNT(CASE WHEN sp.status = 'rejected' THEN 1 END) as rejected_steps
       FROM Projects p
       JOIN Steps s ON s.project_id = p.id
       LEFT JOIN StudentProgress sp ON sp.step_id = s.id AND sp.user_id = ?
       GROUP BY p.id, p.title, p.type, p.level
       ORDER BY p.level, p.order_index`,
      [userId]
    );
    return rows;
  }
}

module.exports = StudentProgress;
