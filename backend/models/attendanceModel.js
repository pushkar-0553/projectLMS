const pool = require('../config/db');

class AttendanceModel {

  // Get all batches for a coordinator
  static async getBatchesByCoordinator(coordinatorId) {
    const [rows] = await pool.execute(
      `SELECT b.id, b.name, b.description, b.start_date, b.end_date, b.is_active, 
              COUNT(sbm.student_id) as student_count
       FROM Batches b
       LEFT JOIN StudentBatchMap sbm ON b.id = sbm.batch_id
       WHERE b.coordinator_id = ? AND b.is_active = TRUE
       GROUP BY b.id, b.name, b.description, b.start_date, b.end_date, b.is_active
       ORDER BY b.name`,
      [coordinatorId]
    );
    return rows;
  }

  // Get all active batches (admin use)
  static async getAllBatches() {
    const [rows] = await pool.execute(
      `SELECT b.id, b.name, b.description, b.start_date, b.end_date, b.is_active, 
              u.name as coordinator_name, COUNT(sbm.student_id) as student_count
       FROM Batches b
       LEFT JOIN Users u ON b.coordinator_id = u.id
       LEFT JOIN StudentBatchMap sbm ON b.id = sbm.batch_id
       WHERE b.is_active = TRUE
       GROUP BY b.id, b.name, b.description, b.start_date, b.end_date, b.is_active, u.name
       ORDER BY b.name`
    );
    return rows;
  }

  // Get students in a batch
  static async getStudentsByBatch(batchId) {
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.mobile, sbm.assigned_at
       FROM Users u
       JOIN StudentBatchMap sbm ON u.id = sbm.student_id
       WHERE sbm.batch_id = ? AND u.role = 'student'
       ORDER BY u.name`,
      [batchId]
    );
    return rows;
  }

  // Get students NOT assigned to any batch
  static async getUnassignedStudents() {
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.mobile
       FROM Users u
       WHERE u.role = 'student'
         AND u.id NOT IN (SELECT student_id FROM StudentBatchMap)
       ORDER BY u.name`
    );
    return rows;
  }

  // Assign student to batch (coordinator action)
  static async assignStudentToBatch(studentId, batchId, assignedBy) {
    const [result] = await pool.execute(
      `INSERT INTO StudentBatchMap (student_id, batch_id, assigned_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE batch_id = VALUES(batch_id), assigned_by = VALUES(assigned_by)`,
      [studentId, batchId, assignedBy]
    );
    return result.affectedRows > 0;
  }

  // Remove student from batch
  static async removeStudentFromBatch(studentId, batchId) {
    const [result] = await pool.execute(
      `DELETE FROM StudentBatchMap WHERE student_id = ? AND batch_id = ?`,
      [studentId, batchId]
    );
    return result.affectedRows > 0;
  }

  // Get or create today's session for a batch
  static async getOrCreateTodaySession(batchId, createdBy, topicCovered = '', notes = '') {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Check if session already exists
    const [existing] = await pool.execute(
      `SELECT * FROM AttendanceSessions WHERE batch_id = ? AND session_date = ?`,
      [batchId, today]
    );

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new session
    const [result] = await pool.execute(
      `INSERT INTO AttendanceSessions (batch_id, session_date, topic_covered, notes, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [batchId, today, topicCovered, notes, createdBy]
    );

    const [newSession] = await pool.execute(
      `SELECT * FROM AttendanceSessions WHERE id = ?`,
      [result.insertId]
    );
    return newSession[0];
  }

  // Update session topic/notes
  static async updateSession(sessionId, topicCovered, notes) {
    const [result] = await pool.execute(
      `UPDATE AttendanceSessions SET topic_covered = ?, notes = ? WHERE id = ?`,
      [topicCovered, notes, sessionId]
    );
    return result.affectedRows > 0;
  }

  // Get today's attendance for a batch (with student list)
  static async getTodayAttendance(batchId) {
    const today = new Date().toISOString().slice(0, 10);

    const [session] = await pool.execute(
      `SELECT * FROM AttendanceSessions WHERE batch_id = ? AND session_date = ?`,
      [batchId, today]
    );

    if (session.length === 0) {
      // No session yet — return students with no status
      const students = await this.getStudentsByBatch(batchId);
      return { session: null, records: students.map(s => ({ ...s, student_id: s.id, status: null, remarks: '' })) };
    }

    const [records] = await pool.execute(
      `SELECT u.id as student_id, u.name, u.email, u.mobile,
              ar.status, ar.remarks, ar.marked_at
       FROM Users u
       JOIN StudentBatchMap sbm ON u.id = sbm.student_id
       LEFT JOIN AttendanceRecords ar ON u.id = ar.student_id AND ar.session_id = ?
       WHERE sbm.batch_id = ? AND u.role = 'student'
       ORDER BY u.name`,
      [session[0].id, batchId]
    );

    return { session: session[0], records };
  }

  // Save/update attendance record for one student
  static async saveRecord(sessionId, studentId, status, markedBy, remarks = '') {
    const [result] = await pool.execute(
      `INSERT INTO AttendanceRecords (session_id, student_id, status, marked_by, remarks)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by),
                               remarks = VALUES(remarks), marked_at = CURRENT_TIMESTAMP`,
      [sessionId, studentId, status, markedBy, remarks]
    );
    return result.affectedRows > 0;
  }

  // Bulk save attendance (mark all at once)
  static async bulkSaveRecords(sessionId, records, markedBy) {
    // records: [{ studentId, status, remarks }]
    if (!records || records.length === 0) return true;

    const values = [];
    const placeholders = records.map(r => {
      values.push(sessionId, r.studentId, r.status, markedBy, r.remarks || '');
      return '(?, ?, ?, ?, ?)';
    }).join(', ');

    await pool.execute(
      `INSERT INTO AttendanceRecords (session_id, student_id, status, marked_by, remarks)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by),
                               remarks = VALUES(remarks), marked_at = CURRENT_TIMESTAMP`,
      values
    );
    return true;
  }

  // Get attendance history for a batch (all dates)
  static async getHistory(batchId, startDate, endDate) {
    const [rows] = await pool.execute(
      `SELECT
         s.id as session_id, s.session_date, s.topic_covered, s.notes,
         COUNT(ar.id) as total_marked,
         COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
         COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
         COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_count,
         COUNT(CASE WHEN ar.status = 'excused' THEN 1 END) as excused_count,
         bc.student_count as total_students
       FROM AttendanceSessions s
       LEFT JOIN AttendanceRecords ar ON s.id = ar.session_id
       LEFT JOIN (
         SELECT batch_id, COUNT(*) as student_count 
         FROM StudentBatchMap 
         WHERE batch_id = ?
         GROUP BY batch_id
       ) bc ON s.batch_id = bc.batch_id
       WHERE s.batch_id = ?
         AND s.session_date BETWEEN ? AND ?
       GROUP BY s.id, s.session_date, s.topic_covered, s.notes, bc.student_count
       ORDER BY s.session_date DESC`,
      [batchId, batchId, startDate, endDate]
    );
    return rows;
  }

  // Get full attendance detail for one session
  static async getSessionDetail(sessionId) {
    const [session] = await pool.execute(
      `SELECT s.*, b.name as batch_name
       FROM AttendanceSessions s
       JOIN Batches b ON s.batch_id = b.id
       WHERE s.id = ?`,
      [sessionId]
    );

    const [records] = await pool.execute(
      `SELECT u.id as student_id, u.name, u.email,
              COALESCE(ar.status, 'absent') as status,
              ar.remarks, ar.marked_at
       FROM Users u
       JOIN StudentBatchMap sbm ON u.id = sbm.student_id
       LEFT JOIN AttendanceRecords ar ON u.id = ar.student_id AND ar.session_id = ?
       WHERE sbm.batch_id = (SELECT batch_id FROM AttendanceSessions WHERE id = ?)
         AND u.role = 'student'
       ORDER BY u.name`,
      [sessionId, sessionId]
    );

    return { session: session[0], records };
  }

  // Get a student's attendance summary (for student dashboard)
  static async getStudentSummary(studentId, batchId, startDate, endDate) {
    const [rows] = await pool.execute(
      `SELECT
         s.session_date, s.topic_covered,
         COALESCE(ar.status, 'absent') as status,
         ar.remarks
       FROM AttendanceSessions s
       LEFT JOIN AttendanceRecords ar ON s.id = ar.session_id AND ar.student_id = ?
       WHERE s.batch_id = ?
         AND s.session_date BETWEEN ? AND ?
       ORDER BY s.session_date DESC`,
      [studentId, batchId, startDate, endDate]
    );
    return rows;
  }

  // Get all batches (for assignment dropdown — admin sees all, coordinator sees own)
  static async getAllActiveBatches() {
    const [rows] = await pool.execute(
      `SELECT b.id, b.name, b.description, u.name as coordinator_name,
              COUNT(sbm.student_id) as student_count
       FROM Batches b
       LEFT JOIN Users u ON b.coordinator_id = u.id
       LEFT JOIN StudentBatchMap sbm ON b.id = sbm.batch_id
       WHERE b.is_active = TRUE
       GROUP BY b.id, b.name, b.description, u.name
       ORDER BY b.name`
    );
    return rows;
  }

  // Get student's current batch assignment
  static async getStudentBatch(studentId) {
    const [rows] = await pool.execute(
      `SELECT b.id, b.name, b.description, sbm.assigned_at,
              u.name as coordinator_name
       FROM StudentBatchMap sbm
       JOIN Batches b ON sbm.batch_id = b.id
       LEFT JOIN Users u ON b.coordinator_id = u.id
       WHERE sbm.student_id = ?
       LIMIT 1`,
      [studentId]
    );
    return rows[0] || null;
  }
}

module.exports = AttendanceModel;
