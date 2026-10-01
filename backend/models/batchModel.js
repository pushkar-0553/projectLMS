const pool = require('../config/db');

class Batch {
  static async create(name, classLink = null, courseId = 1, studentIds = []) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        'INSERT INTO Batches (name, class_link, course_id) VALUES (?, ?, ?)',
        [name, classLink, courseId || 1]
      );
      const batchId = result.insertId;

      if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
        for (const studentId of studentIds) {
          const sId = parseInt(studentId, 10);
          if (!isNaN(sId)) {
            await connection.execute(
              'INSERT INTO StudentBatchMap (student_id, batch_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE batch_id = VALUES(batch_id)',
              [sId, batchId]
            );
          }
        }

        const placeholders = studentIds.map(() => '?').join(',');
        await connection.execute(
          `UPDATE Users SET batch = ? WHERE id IN (${placeholders})`,
          [name, ...studentIds]
        );
      }

      await connection.commit();
      return batchId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async delete(batchId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Find batch name
      const [bRows] = await connection.execute('SELECT name FROM Batches WHERE id = ?', [batchId]);
      const batchName = bRows[0]?.name;

      // Clear any ClassLinks and AttendanceSessions referencing this batch
      await connection.execute('UPDATE ClassLinks SET batch_id = NULL, sub_batch_id = NULL WHERE batch_id = ?', [batchId]);
      await connection.execute('UPDATE AttendanceSessions SET batch_id = NULL, sub_batch_id = NULL WHERE batch_id = ?', [batchId]);

      // Remove from StudentBatchMap
      await connection.execute('DELETE FROM StudentBatchMap WHERE batch_id = ?', [batchId]);

      // Delete sub-batches
      await connection.execute('DELETE FROM SubBatches WHERE batch_id = ?', [batchId]);

      // Delete the batch
      const [result] = await connection.execute('DELETE FROM Batches WHERE id = ?', [batchId]);

      // Reset Users.batch if matching
      if (batchName) {
        await connection.execute('UPDATE Users SET batch = NULL WHERE batch = ?', [batchName]);
      }

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async bulkAssignStudents(studentIds, batchId) {
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return 0;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      if (batchId) {
        const [bRows] = await connection.execute('SELECT id, name FROM Batches WHERE id = ?', [batchId]);
        if (bRows.length === 0) {
          throw new Error('Target batch does not exist');
        }
        const batchName = bRows[0].name;

        for (const sId of studentIds) {
          const numId = parseInt(sId, 10);
          if (!isNaN(numId)) {
            await connection.execute(
              `INSERT INTO StudentBatchMap (student_id, batch_id) 
               VALUES (?, ?) 
               ON DUPLICATE KEY UPDATE batch_id = VALUES(batch_id), sub_batch_id = NULL`,
              [numId, batchId]
            );
          }
        }

        const placeholders = studentIds.map(() => '?').join(',');
        await connection.execute(
          `UPDATE Users SET batch = ? WHERE id IN (${placeholders})`,
          [batchName, ...studentIds]
        );
      } else {
        // Unassign batch
        const placeholders = studentIds.map(() => '?').join(',');
        await connection.execute(
          `DELETE FROM StudentBatchMap WHERE student_id IN (${placeholders})`,
          studentIds
        );
        await connection.execute(
          `UPDATE Users SET batch = NULL WHERE id IN (${placeholders})`,
          studentIds
        );
      }

      await connection.commit();
      return studentIds.length;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getBatchResumeStats(courseId = null) {
    let whereClause = '';
    const params = [];
    if (courseId) {
      whereClause = 'WHERE b.course_id = ?';
      params.push(courseId);
    }

    const [batchRows] = await pool.execute(
      `SELECT 
        b.id, 
        b.name, 
        b.class_link, 
        b.course_id,
        b.created_at,
        COUNT(DISTINCT u.id) as total_students,
        COUNT(DISTINCT CASE WHEN sr.id IS NOT NULL THEN u.id END) as resumes_uploaded,
        COUNT(DISTINCT CASE WHEN sr.id IS NULL AND u.id IS NOT NULL THEN u.id END) as resumes_missing
       FROM Batches b
       LEFT JOIN StudentBatchMap sbm ON b.id = sbm.batch_id
       LEFT JOIN Users u ON sbm.student_id = u.id AND u.role = 'student'
       LEFT JOIN student_resumes sr ON u.id = sr.student_id AND sr.is_latest = TRUE
       ${whereClause}
       GROUP BY b.id, b.name, b.class_link, b.course_id, b.created_at
       ORDER BY b.created_at DESC`,
      params
    );

    // Also get unassigned students stats for this course
    let unassignedQuery = `
      SELECT 
        COUNT(DISTINCT u.id) as total_students,
        COUNT(DISTINCT CASE WHEN sr.id IS NOT NULL THEN u.id END) as resumes_uploaded,
        COUNT(DISTINCT CASE WHEN sr.id IS NULL THEN u.id END) as resumes_missing
      FROM Users u
      JOIN CourseMemberships cm ON u.id = cm.user_id AND cm.status = 'active'
      LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
      LEFT JOIN student_resumes sr ON u.id = sr.student_id AND sr.is_latest = TRUE
      WHERE u.role = 'student' AND (sbm.batch_id IS NULL OR sbm.batch_id = 0)
    `;
    const unassignedParams = [];
    if (courseId) {
      unassignedQuery += ' AND cm.course_id = ?';
      unassignedParams.push(courseId);
    }
    const [unassignedRows] = await pool.execute(unassignedQuery, unassignedParams);
    const unassignedStats = unassignedRows[0] || { total_students: 0, resumes_uploaded: 0, resumes_missing: 0 };

    return {
      batches: batchRows,
      unassigned: {
        id: 'unassigned',
        name: 'Unassigned / No Batch',
        total_students: Number(unassignedStats.total_students) || 0,
        resumes_uploaded: Number(unassignedStats.resumes_uploaded) || 0,
        resumes_missing: Number(unassignedStats.resumes_missing) || 0
      }
    };
  }

  static async getAll(courseId = null) {
    if (courseId) {
      const [rows] = await pool.execute('SELECT * FROM Batches WHERE course_id = ? ORDER BY created_at DESC', [courseId]);
      return rows;
    }
    const [rows] = await pool.execute('SELECT * FROM Batches ORDER BY created_at DESC');
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM Batches WHERE id = ?', [id]);
    return rows[0];
  }

  static async updateClassLink(batchId, classLink) {
    const [result] = await pool.execute(
      'UPDATE Batches SET class_link = ? WHERE id = ?',
      [classLink || null, batchId]
    );
    return result.affectedRows > 0;
  }

  static async createSubBatch(batchId, name, createdBy, classLink = null) {
    const [result] = await pool.execute(
      'INSERT INTO SubBatches (batch_id, name, created_by, class_link) VALUES (?, ?, ?, ?)',
      [batchId, name, createdBy, classLink]
    );
    return result.insertId;
  }

  static async updateSubBatchClassLink(subBatchId, classLink, coordinatorId = null) {
    const params = [classLink || null, subBatchId];
    let ownerClause = '';
    if (coordinatorId) {
      ownerClause = ' AND created_by = ?';
      params.push(coordinatorId);
    }

    const [result] = await pool.execute(
      `UPDATE SubBatches SET class_link = ? WHERE id = ?${ownerClause}`,
      params
    );
    return result.affectedRows > 0;
  }

  static async getSubBatchesByBatch(batchId) {
    const [rows] = await pool.execute(
      'SELECT sb.*, u.name as creator_name FROM SubBatches sb LEFT JOIN Users u ON sb.created_by = u.id WHERE sb.batch_id = ?',
      [batchId]
    );
    return rows;
  }

  static async getSubBatchesByCoordinator(coordinatorId, courseId = null) {
    if (courseId) {
      const [rows] = await pool.execute(
        'SELECT sb.*, b.name as batch_name, b.class_link as batch_class_link FROM SubBatches sb JOIN Batches b ON sb.batch_id = b.id WHERE sb.created_by = ? AND b.course_id = ?',
        [coordinatorId, courseId]
      );
      return rows;
    }
    const [rows] = await pool.execute(
      'SELECT sb.*, b.name as batch_name, b.class_link as batch_class_link FROM SubBatches sb JOIN Batches b ON sb.batch_id = b.id WHERE sb.created_by = ?',
      [coordinatorId]
    );
    return rows;
  }

  static async assignStudent(studentId, batchId, subBatchId = null) {
    const [result] = await pool.execute(
      'INSERT INTO StudentBatchMap (student_id, batch_id, sub_batch_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE batch_id = VALUES(batch_id), sub_batch_id = VALUES(sub_batch_id)',
      [studentId, batchId, subBatchId]
    );
    return result.affectedRows > 0;
  }

  static async getStudentsBySubBatch(subBatchId) {
    const [rows] = await pool.execute(
      'SELECT u.id, u.name, u.email FROM Users u JOIN StudentBatchMap sbm ON u.id = sbm.student_id WHERE sbm.sub_batch_id = ?',
      [subBatchId]
    );
    return rows;
  }

  static async getBatchHierarchy(courseId = null) {
    let query = 'SELECT * FROM Batches';
    const params = [];
    if (courseId) {
      query += ' WHERE course_id = ?';
      params.push(courseId);
    }
    const [batches] = await pool.execute(query, params);
    const [subBatches] = await pool.execute('SELECT * FROM SubBatches');
    
    // Also attach student counts per batch
    const [counts] = await pool.execute(
      'SELECT batch_id, COUNT(*) as student_count FROM StudentBatchMap WHERE batch_id IS NOT NULL GROUP BY batch_id'
    );
    const countMap = {};
    counts.forEach(c => { countMap[c.batch_id] = c.student_count; });

    return batches.map(b => ({
      ...b,
      student_count: countMap[b.id] || 0,
      subBatches: subBatches.filter(sb => sb.batch_id === b.id)
    }));
  }
}

module.exports = Batch;
