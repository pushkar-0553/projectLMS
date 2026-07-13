const pool = require('../config/db');

class Academic {
  static async createClassLink({ name, url, batch_id, sub_batch_id, created_by }) {
    const [result] = await pool.execute(
      `INSERT INTO ClassLinks (name, url, batch_id, sub_batch_id, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [name, url, batch_id || null, sub_batch_id || null, created_by]
    );
    return result.insertId;
  }

  static async getClassLinks({ batch_id, sub_batch_id }) {
    const params = [];
    const filters = [];

    if (sub_batch_id) {
      filters.push('cl.sub_batch_id = ?');
      params.push(sub_batch_id);
    } else if (batch_id) {
      filters.push('cl.batch_id = ? AND cl.sub_batch_id IS NULL');
      params.push(batch_id);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await pool.execute(
      `SELECT cl.*, b.name as batch_name, sb.name as sub_batch_name
       FROM ClassLinks cl
       LEFT JOIN Batches b ON cl.batch_id = b.id
       LEFT JOIN SubBatches sb ON cl.sub_batch_id = sb.id
       ${where}
       ORDER BY cl.updated_at DESC, cl.created_at DESC`,
      params
    );
    return rows;
  }

  static async updateClassLink(linkId, { name, url }) {
    const [result] = await pool.execute(
      'UPDATE ClassLinks SET name = ?, url = ? WHERE id = ?',
      [name, url, linkId]
    );
    return result.affectedRows > 0;
  }

  static async deleteClassLink(linkId) {
    const [result] = await pool.execute('DELETE FROM ClassLinks WHERE id = ?', [linkId]);
    return result.affectedRows > 0;
  }

  static async createAttendanceSession({ title, session_date, batch_id, sub_batch_id, created_by, notes }) {
    const [result] = await pool.execute(
      `INSERT INTO AttendanceSessions (title, session_date, batch_id, sub_batch_id, created_by, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, session_date, batch_id || null, sub_batch_id || null, created_by, notes || null]
    );
    return result.insertId;
  }

  static async markAttendance(sessionId, records) {
    if (!records || records.length === 0) return 0;

    let affected = 0;
    for (const record of records) {
      const [result] = await pool.execute(
        `INSERT INTO AttendanceRecords (session_id, student_id, status, remarks)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), remarks = VALUES(remarks), marked_at = CURRENT_TIMESTAMP`,
        [sessionId, record.student_id, record.status || 'absent', record.remarks || null]
      );
      affected += result.affectedRows;
    }
    return affected;
  }

  static async getAttendanceSessions(userId = null, startDate = null, endDate = null) {
    const params = [];
    let where = '';
    if (userId) {
      where = 'WHERE ats.created_by = ?';
      params.push(userId);
    }
    
    if (startDate) {
      where += where ? ' AND ats.session_date >= ?' : 'WHERE ats.session_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      where += where ? ' AND ats.session_date <= ?' : 'WHERE ats.session_date <= ?';
      params.push(endDate);
    }

    const [rows] = await pool.execute(
      `SELECT
        ats.id,
        ats.title,
        ats.session_date,
        ats.batch_id,
        ats.sub_batch_id,
        ats.created_by,
        ats.notes,
        ats.created_at,
        b.name as batch_name,
        sb.name as sub_batch_name,
        COUNT(ar.id) as marked_count,
        COALESCE(SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END), 0) as present_count,
        COALESCE(SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END), 0) as absent_count,
        COALESCE(SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END), 0) as late_count,
        ROUND(
          CASE 
            WHEN COUNT(ar.id) > 0 
            THEN (COALESCE(SUM(CASE WHEN ar.status IN ('present', 'late') THEN 1 ELSE 0 END), 0) * 100.0 / COUNT(ar.id))
            ELSE 0 
          END, 2
        ) as attendance_percentage
       FROM AttendanceSessions ats
       LEFT JOIN Batches b ON ats.batch_id = b.id
       LEFT JOIN SubBatches sb ON ats.sub_batch_id = sb.id
       LEFT JOIN AttendanceRecords ar ON ats.id = ar.session_id
       ${where}
       GROUP BY ats.id, ats.title, ats.session_date, ats.batch_id, ats.sub_batch_id, ats.created_by, ats.notes, ats.created_at, b.name, sb.name
       ORDER BY ats.session_date DESC, ats.created_at DESC`,
      params
    );
    return rows;
  }

  static async getAttendanceRecords(sessionId) {
    const [rows] = await pool.execute(
      `SELECT ar.*, u.name as student_name, u.email as student_email, u.batch
       FROM AttendanceRecords ar
       JOIN Users u ON ar.student_id = u.id
       WHERE ar.session_id = ?
       ORDER BY u.name ASC`,
      [sessionId]
    );
    return rows;
  }

  static async getStudentAttendance(studentId) {
    const [rows] = await pool.execute(
      `SELECT ar.*, ats.title, ats.session_date, ats.notes, b.name as batch_name, sb.name as sub_batch_name
       FROM AttendanceRecords ar
       JOIN AttendanceSessions ats ON ar.session_id = ats.id
       LEFT JOIN Batches b ON ats.batch_id = b.id
       LEFT JOIN SubBatches sb ON ats.sub_batch_id = sb.id
       WHERE ar.student_id = ?
       ORDER BY ats.session_date DESC`,
      [studentId]
    );
    return rows;
  }

  static async createAssessment({ title, assessment_type, assessment_date, max_marks, syllabus, created_by }) {
    const [result] = await pool.execute(
      `INSERT INTO Assessments (title, assessment_type, assessment_date, max_marks, syllabus, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, assessment_type || 'weekly', assessment_date, max_marks || 100, syllabus || null, created_by]
    );
    return result.insertId;
  }

  static async recordAssessmentResults(assessmentId, results) {
    if (!results || results.length === 0) return 0;

    let affected = 0;
    for (const resultRow of results) {
      const [result] = await pool.execute(
        `INSERT INTO AssessmentResults (assessment_id, student_id, marks_obtained, status, feedback)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained), status = VALUES(status), feedback = VALUES(feedback), recorded_at = CURRENT_TIMESTAMP`,
        [
          assessmentId,
          resultRow.student_id,
          resultRow.marks_obtained || 0,
          resultRow.status || 'needs_improvement',
          resultRow.feedback || null
        ]
      );
      affected += result.affectedRows;
    }
    return affected;
  }

  static async getAssessments(userId = null) {
    const params = [];
    let where = '';
    if (userId) {
      where = 'WHERE a.created_by = ?';
      params.push(userId);
    }

    const [rows] = await pool.execute(
      `SELECT
        a.id,
        a.title,
        a.assessment_type,
        a.assessment_date,
        a.max_marks,
        a.syllabus,
        a.created_by,
        a.created_at,
        COUNT(ar.id) as result_count,
        ROUND(AVG(ar.marks_obtained), 2) as average_marks,
        COALESCE(SUM(CASE WHEN ar.status = 'passed' THEN 1 ELSE 0 END), 0) as passed_count,
        COALESCE(SUM(CASE WHEN ar.status = 'needs_improvement' THEN 1 ELSE 0 END), 0) as needs_improvement_count
       FROM Assessments a
       LEFT JOIN AssessmentResults ar ON a.id = ar.assessment_id
       ${where}
       GROUP BY a.id, a.title, a.assessment_type, a.assessment_date, a.max_marks, a.syllabus, a.created_by, a.created_at
       ORDER BY a.assessment_date DESC, a.created_at DESC`,
      params
    );
    return rows;
  }

  static async getStudentAssessmentResults(studentId) {
    const [rows] = await pool.execute(
      `SELECT ar.*, a.title, a.assessment_type, a.assessment_date, a.max_marks, a.syllabus
       FROM AssessmentResults ar
       JOIN Assessments a ON ar.assessment_id = a.id
       WHERE ar.student_id = ?
       ORDER BY a.assessment_date DESC`,
      [studentId]
    );
    return rows;
  }

  static async getOverview() {
    const [[attendance]] = await pool.execute(
      `SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present_marks,
        COUNT(ar.id) as total_marks
       FROM AttendanceSessions ats
       LEFT JOIN AttendanceRecords ar ON ats.id = ar.session_id`
    );

    const [[assessments]] = await pool.execute(
      `SELECT 
        COUNT(DISTINCT a.id) as total_assessments,
        ROUND(AVG(ar.marks_obtained), 2) as average_marks,
        COUNT(ar.id) as total_results
       FROM Assessments a
       LEFT JOIN AssessmentResults ar ON a.id = ar.assessment_id`
    );

    return { attendance, assessments };
  }
}

module.exports = Academic;
