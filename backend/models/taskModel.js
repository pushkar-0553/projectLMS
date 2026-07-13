const pool = require('../config/db');

class Task {
  static async create({ title, description, file_path, created_by, assigned_type, deadline }) {
    const [result] = await pool.execute(
      'INSERT INTO Tasks (title, description, file_path, created_by, assigned_type, deadline) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, file_path, created_by, assigned_type, deadline]
    );
    return result.insertId;
  }

  static async assign(taskId, { batch_id, sub_batch_id, student_id }) {
    const [result] = await pool.execute(
      'INSERT INTO TaskAssignments (task_id, batch_id, sub_batch_id, student_id) VALUES (?, ?, ?, ?)',
      [taskId, batch_id || null, sub_batch_id || null, student_id || null]
    );
    return result.insertId;
  }

  static async getTasksByCoordinator(coordinatorId) {
    const [rows] = await pool.execute(
      `SELECT t.*, 
        (SELECT COUNT(*) FROM TaskAssignments WHERE task_id = t.id) as assignment_count,
        (SELECT COUNT(*) FROM Submissions WHERE task_id = t.id) as submission_count
      FROM Tasks t WHERE t.created_by = ? ORDER BY t.created_at DESC`,
      [coordinatorId]
    );
    return rows;
  }

  static async getTasksForStudent(studentId) {
    // This query gets tasks assigned to the student directly, OR to their batch, OR to their sub-batch
    const [rows] = await pool.execute(
      `SELECT DISTINCT t.*, s.status as submission_status, s.status as review_status
       FROM Tasks t
       JOIN TaskAssignments ta_map ON t.id = ta_map.task_id
       LEFT JOIN Submissions s ON t.id = s.task_id AND s.student_id = ?
       LEFT JOIN StudentBatchMap sbm ON sbm.user_id = ?
       WHERE ta_map.student_id = ? 
          OR ta_map.sub_batch_id = sbm.sub_batch_id
          OR (ta_map.batch_id = sbm.batch_id AND ta_map.sub_batch_id IS NULL AND ta_map.student_id IS NULL)
       ORDER BY t.created_at DESC`,
      [studentId, studentId, studentId]
    );
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM Tasks WHERE id = ?', [id]);
    return rows[0];
  }

  static async submitTask({ task_id, student_id, submission_text, file_path }) {
    const [result] = await pool.execute(
      'INSERT INTO Submissions (task_id, student_id, submission_text, file_path, status) VALUES (?, ?, ?, ?, "submitted")',
      [task_id, student_id, submission_text, file_path]
    );
    return result.insertId;
  }

  static async getSubmissionsByTask(taskId) {
    const [rows] = await pool.execute(
      `SELECT s.*, u.name as student_name, u.email as student_email 
       FROM Submissions s 
       JOIN Users u ON s.student_id = u.id 
       WHERE s.task_id = ? ORDER BY s.submitted_at DESC`,
      [taskId]
    );
    return rows;
  }

  static async reviewSubmission(submissionId, { status, feedback, reviewerId }) {
    const [result] = await pool.execute(
      'UPDATE Submissions SET status = ?, feedback = ?, reviewer_id = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, feedback, reviewerId, submissionId]
    );
    return result.affectedRows > 0;
  }

  static async getHistory(userId, role) {
    let query = 'SELECT * FROM ActivityLogs';
    let params = [];
    
    if (role === 'coordinator') {
      query += ' WHERE user_id = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }
}

module.exports = Task;
