const pool = require('../config/db');

class User {
  static async create({ name, email, password, role = 'student', mobile = null, batch = null }) {
    const [result] = await pool.execute(
      'INSERT INTO Users (name, email, password, role, mobile, batch) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, password, role, mobile, batch]
    );
    return result.insertId;
  }

  static async bulkCreate(users) {
    if (!users || users.length === 0) return 0;
    
    const values = [];
    const placeholders = users.map(user => {
      values.push(user.name, user.email, user.password, user.role || 'student', user.mobile || null, user.batch || null);
      return '(?, ?, ?, ?, ?, ?)';
    }).join(', ');

    const query = `INSERT INTO Users (name, email, password, role, mobile, batch) VALUES ${placeholders}`;
    const [result] = await pool.execute(query, values);
    return result.affectedRows;
  }

  static async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM Users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, mobile, batch, created_at FROM Users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findByIdWithPassword(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM Users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async getAll() {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, mobile, batch, created_at FROM Users ORDER BY created_at DESC'
    );
    return rows;
  }

  static async findByRole(role, courseId = null) {
    if (courseId) {
      if (role === 'student') {
        const [rows] = await pool.execute(
          `SELECT u.id, u.name, u.email, u.role, u.mobile, u.batch, u.created_at,
            sbm.batch_id,
            sbm.sub_batch_id,
            b.name as batch_name,
            sb.name as sub_batch_name,
            cm.course_id
           FROM Users u
           JOIN CourseMemberships cm ON u.id = cm.user_id AND cm.course_id = ? AND cm.status = 'active'
           LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
           LEFT JOIN Batches b ON sbm.batch_id = b.id
           LEFT JOIN SubBatches sb ON sbm.sub_batch_id = sb.id
           WHERE u.role = ?
           ORDER BY u.created_at DESC`,
          [courseId, role]
        );
        return rows;
      }

      const [rows] = await pool.execute(
        `SELECT u.id, u.name, u.email, u.role, u.mobile, u.batch, u.created_at, cm.course_id
         FROM Users u
         JOIN CourseMemberships cm ON u.id = cm.user_id AND cm.course_id = ? AND cm.status = 'active'
         WHERE u.role = ?
         ORDER BY u.created_at DESC`,
        [courseId, role]
      );
      return rows;
    }

    if (role === 'student') {
      const [rows] = await pool.execute(
        `SELECT u.id, u.name, u.email, u.role, u.mobile, u.batch, u.created_at,
          sbm.batch_id,
          sbm.sub_batch_id,
          b.name as batch_name,
          sb.name as sub_batch_name
         FROM Users u
         LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
         LEFT JOIN Batches b ON sbm.batch_id = b.id
         LEFT JOIN SubBatches sb ON sbm.sub_batch_id = sb.id
         WHERE u.role = ?
         ORDER BY u.created_at DESC`,
        [role]
      );
      return rows;
    }

    const [rows] = await pool.execute(
      'SELECT id, name, email, role, mobile, batch, created_at FROM Users WHERE role = ? ORDER BY created_at DESC',
      [role]
    );
    return rows;
  }

  static async update(userId, fields) {
    const allowed = [
      'name', 'email', 'mobile', 'phone', 'batch', 'domain',
      'college', 'passout_year', 'current_location', 'skills', 'github', 'linkedin'
    ];
    const updates = [];
    const values = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }

    if (updates.length === 0) return false;

    values.push(userId);
    const [result] = await pool.execute(
      `UPDATE Users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async updatePassword(userId, password) {
    const [result] = await pool.execute(
      'UPDATE Users SET password = ? WHERE id = ?',
      [password, userId]
    );
    return result.affectedRows > 0;
  }

  static async updateRole(userId, role) {
    const [result] = await pool.execute(
      'UPDATE Users SET role = ? WHERE id = ?',
      [role, userId]
    );
    return result.affectedRows > 0;
  }

  static async delete(userId) {
    const [result] = await pool.execute(
      'DELETE FROM Users WHERE id = ?',
      [userId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = User;
