const pool = require('../config/db');

class Resume {
  /**
   * Create a new resume record. Automatically sets previous versions is_latest to false.
   */
  static async create({ studentId, resumeTitle, resumeFileName, cloudinaryPublicId, cloudinaryUrl }) {
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
          (student_id, resume_title, resume_file_name, file_name, cloudinary_public_id, cloudinary_url, version, is_latest)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [studentId, resumeTitle, resumeFileName, resumeFileName, cloudinaryPublicId, cloudinaryUrl, nextVersion]
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
   * Get all students with their latest resume details, private notes, and batch name.
   */
  static async getAllStudentsWithResumeStatus() {
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
        b.name as batch_name,
        sr.id as resume_id,
        sr.resume_title,
        sr.resume_file_name,
        sr.file_name,
        sr.cloudinary_public_id,
        sr.cloudinary_url,
        sr.version,
        sr.updated_at as resume_updated_at,
        CASE WHEN sr.id IS NOT NULL THEN TRUE ELSE FALSE END as has_resume
       FROM Users u
       LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
       LEFT JOIN Batches b ON sbm.batch_id = b.id
       LEFT JOIN student_resumes sr ON u.id = sr.student_id AND sr.is_latest = TRUE
       WHERE u.role = 'student'
       ORDER BY u.name ASC`
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
}

module.exports = Resume;
