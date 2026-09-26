const pool = require('../config/db');

class Batch {
  static async create(name, classLink = null, courseId = 1) {
    const [result] = await pool.execute('INSERT INTO Batches (name, class_link, course_id) VALUES (?, ?, ?)', [name, classLink, courseId || 1]);
    return result.insertId;
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
    
    return batches.map(b => ({
      ...b,
      subBatches: subBatches.filter(sb => sb.batch_id === b.id)
    }));
  }
}

module.exports = Batch;
