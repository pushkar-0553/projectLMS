const pool = require('../config/db');

class ResumeCollection {
  /**
   * Create a collection and associate selected students.
   */
  static async create({ title, shareToken, createdBy, studentIds, companyName, salary, jd }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Create collection record
      const [colResult] = await connection.execute(
        `INSERT INTO resume_collections (title, share_token, created_by, company_name, salary, jd)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title, shareToken, createdBy || null, companyName || null, salary || null, jd || null]
      );
      const collectionId = colResult.insertId;

      // 2. Insert mapping records for each student
      if (studentIds && studentIds.length > 0) {
        const placeholders = studentIds.map(() => '(?, ?)').join(', ');
        const values = [];
        studentIds.forEach(studentId => {
          values.push(collectionId, studentId);
        });

        await connection.execute(
          `INSERT INTO resume_collection_students (collection_id, student_id)
           VALUES ${placeholders}`,
          values
        );
      }

      await connection.commit();
      return collectionId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all collections.
   */
  static async getAll() {
    const [rows] = await pool.execute(
      `SELECT rc.*, 
         (SELECT name FROM Users WHERE id = rc.created_by) as creator_name,
         (SELECT COUNT(*) FROM resume_collection_students rcs WHERE rcs.collection_id = rc.id) as student_count
       FROM resume_collections rc
       ORDER BY rc.created_at DESC`
    );
    return rows;
  }

  /**
   * Get a collection by ID.
   */
  static async getById(id) {
    // Get collection metadata
    const [cols] = await pool.execute(
      `SELECT rc.*, u.name as creator_name 
       FROM resume_collections rc
       LEFT JOIN Users u ON rc.created_by = u.id
       WHERE rc.id = ?`,
      [id]
    );

    if (cols.length === 0) return null;
    const collection = cols[0];

    // Get associated students
    const [students] = await pool.execute(
      `SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.mobile, 
        u.batch,
        u.domain,
        sr.resume_title,
        sr.cloudinary_url,
        rcs.review_status,
        rcs.review_comment,
        rcs.reviewed_at
       FROM resume_collection_students rcs
       JOIN Users u ON rcs.student_id = u.id
       LEFT JOIN student_resumes sr ON u.id = sr.student_id AND sr.is_latest = TRUE
       WHERE rcs.collection_id = ?`,
      [id]
    );

    collection.students = students;
    return collection;
  }

  /**
   * Get public collection details by share token.
   * This is used by the public unauthenticated page.
   * Note: We NEVER return notes or other sensitive fields.
   */
  static async getByToken(token) {
    const [cols] = await pool.execute(
      `SELECT id, title, created_at, expires_at, is_active, company_name, salary, jd 
       FROM resume_collections 
       WHERE share_token = ? AND is_active = TRUE`,
      [token]
    );

    if (cols.length === 0) return null;
    const collection = cols[0];

    // Check expiration if set
    if (collection.expires_at && new Date(collection.expires_at) < new Date()) {
      return null; // Expired
    }

    // Get associated students and their latest resumes
    const [students] = await pool.execute(
      `SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.mobile, 
        u.batch,
        u.domain,
        sr.resume_title,
        sr.resume_file_name,
        sr.file_name,
        sr.cloudinary_public_id,
        sr.cloudinary_url,
        u.college,
        u.passout_year,
        u.current_location,
        u.skills,
        u.github,
        u.linkedin,
        rcs.review_status,
        rcs.review_comment,
        rcs.reviewed_at
       FROM resume_collection_students rcs
       JOIN Users u ON rcs.student_id = u.id
       LEFT JOIN student_resumes sr ON u.id = sr.student_id AND sr.is_latest = TRUE
       WHERE rcs.collection_id = ?`,
      [collection.id]
    );

    collection.students = students;
    return collection;
  }

  /**
   * Update student placement-related review feedback.
   */
  static async updateStudentReview(collectionId, studentId, { reviewStatus, reviewComment }) {
    const [result] = await pool.execute(
      `UPDATE resume_collection_students 
       SET review_status = ?, review_comment = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE collection_id = ? AND student_id = ?`,
      [reviewStatus, reviewComment || null, collectionId, studentId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Add new student candidates to an existing collection link.
   * Uses INSERT IGNORE to prevent duplicate entries cleanly.
   */
  static async addStudents(collectionId, studentIds) {
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return false;
    }

    const placeholders = studentIds.map(() => '(?, ?)').join(', ');
    const values = [];
    studentIds.forEach(studentId => {
      values.push(collectionId, studentId);
    });

    const [result] = await pool.execute(
      `INSERT IGNORE INTO resume_collection_students (collection_id, student_id)
       VALUES ${placeholders}`,
      values
    );
    return result.affectedRows;
  }

  /**
   * Remove a candidate from a collection link.
   */
  static async removeStudent(collectionId, studentId) {
    const [result] = await pool.execute(
      'DELETE FROM resume_collection_students WHERE collection_id = ? AND student_id = ?',
      [collectionId, studentId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Update collection metadata.
   */
  static async update(collectionId, { title, companyName, salary, jd }) {
    const [result] = await pool.execute(
      `UPDATE resume_collections
       SET title = COALESCE(?, title),
           company_name = COALESCE(?, company_name),
           salary = COALESCE(?, salary),
           jd = COALESCE(?, jd)
       WHERE id = ?`,
      [title || null, companyName || null, salary || null, jd || null, collectionId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Delete a collection.
   */
  static async delete(id) {
    const [result] = await pool.execute(
      'DELETE FROM resume_collections WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = ResumeCollection;
