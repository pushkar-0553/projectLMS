const pool = require('../config/db');

class CourseMembership {
  static async find(userId, courseId) {
    const [rows] = await pool.execute(
      'SELECT * FROM CourseMemberships WHERE user_id = ? AND course_id = ? LIMIT 1',
      [userId, courseId]
    );
    return rows[0] || null;
  }

  static async getUserMemberships(userId) {
    const [rows] = await pool.execute(
      `SELECT cm.*, c.name as course_name, c.code as course_code, c.slug as course_slug, 
              c.logo_url, c.status as course_status, b.name as batch_name
       FROM CourseMemberships cm
       JOIN Courses c ON cm.course_id = c.id
       LEFT JOIN Batches b ON cm.batch_id = b.id
       WHERE cm.user_id = ? AND cm.status = 'active' AND c.status = 'active'
       ORDER BY cm.created_at ASC`,
      [userId]
    );
    return rows;
  }

  static async getCourseMembers(courseId, role = null) {
    let query = `
      SELECT cm.*, u.name, u.email, u.mobile, b.name as batch_name
      FROM CourseMemberships cm
      JOIN Users u ON cm.user_id = u.id
      LEFT JOIN Batches b ON cm.batch_id = b.id
      WHERE cm.course_id = ?
    `;
    const params = [courseId];

    if (role) {
      query += ' AND cm.role = ?';
      params.push(role);
    }

    query += ' ORDER BY cm.created_at DESC';
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async enroll({ userId, courseId, role = 'student', batchId = null }) {
    const [result] = await pool.execute(
      `INSERT INTO CourseMemberships (user_id, course_id, role, batch_id, status)
       VALUES (?, ?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE 
         role = VALUES(role),
         batch_id = COALESCE(VALUES(batch_id), batch_id),
         status = 'active'`,
      [userId, courseId, role, batchId]
    );
    return result.affectedRows > 0;
  }

  static async updateStatus(userId, courseId, status) {
    const [result] = await pool.execute(
      'UPDATE CourseMemberships SET status = ? WHERE user_id = ? AND course_id = ?',
      [status, userId, courseId]
    );
    return result.affectedRows > 0;
  }

  static async remove(userId, courseId) {
    const [result] = await pool.execute(
      'DELETE FROM CourseMemberships WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = CourseMembership;
