const pool = require('../config/db');

class Resume {
  /**
   * Create a new resume record. Automatically sets previous versions is_latest to false.
   */
  static async create({ studentId, resumeTitle, resumeFileName, cloudinaryPublicId, cloudinaryUrl, courseId }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Mark all existing resumes of this student as not latest
      await connection.execute(
        'UPDATE student_resumes SET is_latest = FALSE WHERE student_id = ?',
        [studentId]
      );

      // 2. Get next version number
      const [rows] = await connection.execute(
        'SELECT COALESCE(MAX(version), 0) as max_version FROM student_resumes WHERE student_id = ?',
        [studentId]
      );
      const nextVersion = rows[0].max_version + 1;

      // 3. Insert the new resume
      const [result] = await connection.execute(
        `INSERT INTO student_resumes 
          (student_id, resume_title, resume_file_name, file_name, cloudinary_public_id, cloudinary_url, version, is_latest, course_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
        [studentId, resumeTitle, resumeFileName, resumeFileName, cloudinaryPublicId, cloudinaryUrl, nextVersion, courseId || 1]
      );

      await connection.commit();
      return { id: result.insertId, version: nextVersion };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get a resume record by ID.
   */
  static async getById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM student_resumes WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Delete a resume record by ID.
   * If the deleted resume was the latest, it marks the previous version as is_latest.
   */
  static async delete(id) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [rows] = await connection.execute(
        'SELECT student_id, is_latest FROM student_resumes WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) {
        await connection.rollback();
        return false;
      }
      
      const { student_id, is_latest } = rows[0];

      await connection.execute(
        'DELETE FROM student_resumes WHERE id = ?',
        [id]
      );

      // Restore previous version as latest if latest was deleted
      if (is_latest) {
        const [prevRows] = await connection.execute(
          'SELECT id FROM student_resumes WHERE student_id = ? ORDER BY version DESC LIMIT 1',
          [student_id]
        );
        if (prevRows.length > 0) {
          await connection.execute(
            'UPDATE student_resumes SET is_latest = TRUE WHERE id = ?',
            [prevRows[0].id]
          );
        }
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get the latest resume for a student.
   */
  static async getLatestByStudent(studentId) {
    const [rows] = await pool.execute(
      'SELECT * FROM student_resumes WHERE student_id = ? AND is_latest = TRUE LIMIT 1',
      [studentId]
    );
    return rows[0] || null;
  }

  /**
   * Get full resume history for a student.
   */
  static async getHistoryByStudent(studentId) {
    const [rows] = await pool.execute(
      'SELECT * FROM student_resumes WHERE student_id = ? ORDER BY version DESC',
      [studentId]
    );
    return rows;
  }

  /**
   * Get all students with their latest resume details, private notes, batch name, and course info.
   * Can be scoped by courseId.
   */
  static async getAllStudentsWithResumeStatus(courseId = null, batchId = null) {
    let batchFilterClause = '';
    const extraParams = [];

    if (batchId !== null && batchId !== undefined && batchId !== '') {
      if (batchId === 'unassigned') {
        batchFilterClause = ' AND (sbm.batch_id IS NULL OR sbm.batch_id = 0)';
      } else {
        const numBatch = parseInt(batchId, 10);
        if (!isNaN(numBatch)) {
          batchFilterClause = ' AND (sbm.batch_id = ? OR b.id = ?)';
          extraParams.push(numBatch, numBatch);
        }
      }
    }

    if (courseId) {
      const [rows] = await pool.execute(
        `SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.mobile, 
          u.batch,
          u.domain, 
          u.college, 
          u.passout_year, 
          u.current_location, 
          u.skills, 
          u.github, 
          u.linkedin,
          b.id as batch_id,
          b.name as batch_name,
          sr.id as resume_id,
          sr.resume_title,
          sr.resume_file_name,
          sr.file_name,
          sr.cloudinary_public_id,
          sr.cloudinary_url,
          sr.version,
          sr.updated_at as resume_updated_at,
          CASE WHEN sr.id IS NOT NULL THEN TRUE ELSE FALSE END as has_resume,
          c.id as course_id,
          c.name as course_name,
          c.code as course_code,
          c.slug as course_slug
         FROM Users u
         JOIN CourseMemberships cm ON u.id = cm.user_id AND cm.course_id = ? AND cm.status = 'active'
         JOIN Courses c ON cm.course_id = c.id
         LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
         LEFT JOIN Batches b ON sbm.batch_id = b.id
         LEFT JOIN student_resumes sr ON u.id = sr.student_id AND sr.is_latest = TRUE AND (sr.course_id = ? OR sr.course_id IS NULL)
         WHERE u.role = 'student'${batchFilterClause}
         ORDER BY u.name ASC`,
        [courseId, courseId, ...extraParams]
      );
      return rows;
    }

    const [rows] = await pool.execute(
      `SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.mobile, 
        u.batch,
        u.domain, 
        u.college, 
        u.passout_year, 
        u.current_location, 
        u.skills, 
        u.github, 
        u.linkedin,
        b.id as batch_id,
        b.name as batch_name,
        sr.id as resume_id,
        sr.resume_title,
        sr.resume_file_name,
        sr.file_name,
        sr.cloudinary_public_id,
        sr.cloudinary_url,
        sr.version,
        sr.updated_at as resume_updated_at,
        CASE WHEN sr.id IS NOT NULL THEN TRUE ELSE FALSE END as has_resume,
        COALESCE(c.id, 1) as course_id,
        COALESCE(c.name, 'Full Stack Development') as course_name,
        COALESCE(c.code, 'FS-01') as course_code,
        COALESCE(c.slug, 'legacy') as course_slug
       FROM Users u
       LEFT JOIN CourseMemberships cm ON u.id = cm.user_id AND cm.status = 'active'
       LEFT JOIN Courses c ON cm.course_id = c.id
       LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
       LEFT JOIN Batches b ON sbm.batch_id = b.id
       LEFT JOIN student_resumes sr ON u.id = sr.student_id AND sr.is_latest = TRUE
       WHERE u.role = 'student'${batchFilterClause}
       ORDER BY u.name ASC`,
      extraParams
    );
    return rows;
  }

  /**
   * Add a private note for a student.
   */
  static async addNote({ studentId, note, createdBy }) {
    const [result] = await pool.execute(
      'INSERT INTO resume_notes (student_id, note, created_by) VALUES (?, ?, ?)',
      [studentId, note, createdBy || null]
    );
    return result.insertId;
  }

  /**
   * Get private notes for a student, including the name of the mentor who wrote them.
   */
  static async getNotes(studentId) {
    const [rows] = await pool.execute(
      `SELECT rn.*, u.name as author_name, u.role as author_role
       FROM resume_notes rn
       LEFT JOIN Users u ON rn.created_by = u.id
       WHERE rn.student_id = ?
       ORDER BY rn.created_at DESC`,
      [studentId]
    );
    return rows;
  }

  /**
   * Delete a private note.
   */
  static async deleteNote(noteId) {
    const [result] = await pool.execute(
      'DELETE FROM resume_notes WHERE id = ?',
      [noteId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Update student placement-related details.
   */
  static async updatePlacementInfo(studentId, { domain, college, passout_year, current_location, skills, github, linkedin }) {
    const [result] = await pool.execute(
      `UPDATE Users 
       SET domain = ?, college = ?, passout_year = ?, current_location = ?, skills = ?, github = ?, linkedin = ?
       WHERE id = ? AND role = 'student'`,
      [
        domain || null,
        college || null,
        passout_year ? parseInt(passout_year) : null,
        current_location || null,
        skills || null,
        github || null,
        linkedin || null,
        studentId
      ]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get all recruiter review evaluations for a student (excluding pending).
   */
  static async getRecruiterReviews(studentId) {
    const [rows] = await pool.execute(
      `SELECT rcs.*, rc.title as collection_title, rc.company_name
       FROM resume_collection_students rcs
       JOIN resume_collections rc ON rcs.collection_id = rc.id
       WHERE rcs.student_id = ? AND rcs.review_status != 'pending'
       ORDER BY rcs.reviewed_at DESC`,
      [studentId]
    );
    return rows;
  }

  /**
   * Batch get private notes for multiple students (eliminates N+1).
   */
  static async getNotesForStudents(studentIds) {
    if (!studentIds || studentIds.length === 0) return [];
    const placeholders = studentIds.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT rn.*, u.name as author_name, u.role as author_role
       FROM resume_notes rn
       LEFT JOIN Users u ON rn.created_by = u.id
       WHERE rn.student_id IN (${placeholders})
       ORDER BY rn.created_at DESC`,
      studentIds
    );
    return rows;
  }

  /**
   * Batch get recruiter reviews for multiple students (eliminates N+1).
   */
  static async getRecruiterReviewsForStudents(studentIds) {
    if (!studentIds || studentIds.length === 0) return [];
    const placeholders = studentIds.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT rcs.*, rc.title as collection_title, rc.company_name
       FROM resume_collection_students rcs
       JOIN resume_collections rc ON rcs.collection_id = rc.id
       WHERE rcs.student_id IN (${placeholders}) AND rcs.review_status != 'pending'
       ORDER BY rcs.reviewed_at DESC`,
      studentIds
    );
    return rows;
  }
}

module.exports = Resume;
