const pool = require('../config/db');

class Course {
  static async getAll(includeInactive = false) {
    let query = 'SELECT * FROM Courses';
    if (!includeInactive) {
      query += " WHERE status = 'active'";
    }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(query);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM Courses WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async findBySlug(slug) {
    const [rows] = await pool.execute('SELECT * FROM Courses WHERE slug = ?', [slug]);
    return rows[0] || null;
  }

  static async findByCode(code) {
    const [rows] = await pool.execute('SELECT * FROM Courses WHERE code = ?', [code]);
    return rows[0] || null;
  }

  static async resolveCourseId(req) {
    if (!req) return 1;
    if (req.query && req.query.courseId) return parseInt(req.query.courseId, 10);
    if (req.body && req.body.courseId) return parseInt(req.body.courseId, 10);
    if (req.courseId) return req.courseId;
    const slug = req.params?.courseSlug || req.query?.courseSlug || req.headers?.['x-course-slug'];
    if (slug) {
      const c = await this.findBySlug(slug);
      if (c) return c.id;
    }
    if (req.user && req.user.course_id && req.user.role !== 'super_admin') {
      return req.user.course_id;
    }
    return 1; // Default to Course 1 (MERN)
  }

  static async create({ name, code, slug, description, shortName, status = 'active', logoUrl, thumbnailUrl, duration, createdBy }) {
    const [result] = await pool.execute(
      `INSERT INTO Courses 
        (name, code, slug, description, short_name, status, logo_url, thumbnail_url, duration, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        code.toUpperCase(),
        slug.toLowerCase(),
        description || null,
        shortName || null,
        status,
        logoUrl || null,
        thumbnailUrl || null,
        duration || null,
        createdBy || null
      ]
    );

    // Initialize default modules for the newly created course
    const modules = ['projects', 'tasks', 'attendance', 'academics', 'mock_interviews', 'resumes', 'messaging'];
    for (const mKey of modules) {
      await pool.execute(
        `INSERT INTO CourseModules (course_id, module_key, is_enabled) VALUES (?, ?, TRUE)
         ON DUPLICATE KEY UPDATE is_enabled = TRUE`,
        [result.insertId, mKey]
      );
    }

    return result.insertId;
  }

  static async update(id, { name, code, slug, description, shortName, status, logoUrl, thumbnailUrl, duration }) {
    const [result] = await pool.execute(
      `UPDATE Courses 
       SET name = COALESCE(?, name),
           code = COALESCE(?, code),
           slug = COALESCE(?, slug),
           description = COALESCE(?, description),
           short_name = COALESCE(?, short_name),
           status = COALESCE(?, status),
           logo_url = COALESCE(?, logo_url),
           thumbnail_url = COALESCE(?, thumbnail_url),
           duration = COALESCE(?, duration)
       WHERE id = ?`,
      [
        name !== undefined ? name : null,
        code ? code.toUpperCase() : null,
        slug ? slug.toLowerCase() : null,
        description !== undefined ? description : null,
        shortName !== undefined ? shortName : null,
        status !== undefined ? status : null,
        logoUrl !== undefined ? logoUrl : null,
        thumbnailUrl !== undefined ? thumbnailUrl : null,
        duration !== undefined ? duration : null,
        id
      ]
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    // Soft delete / deactivate to preserve historical student data
    const [result] = await pool.execute(
      "UPDATE Courses SET status = 'inactive' WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  }

  static async getCourseStats(courseId) {
    const [[students]] = await pool.execute(
      "SELECT COUNT(*) as count FROM CourseMemberships WHERE course_id = ? AND role = 'student' AND status = 'active'",
      [courseId]
    );
    const [[batches]] = await pool.execute(
      'SELECT COUNT(*) as count FROM Batches WHERE course_id = ?',
      [courseId]
    );
    const [[projects]] = await pool.execute(
      'SELECT COUNT(*) as count FROM Projects WHERE course_id = ?',
      [courseId]
    );
    const [[tasks]] = await pool.execute(
      'SELECT COUNT(*) as count FROM Tasks WHERE course_id = ?',
      [courseId]
    );

    return {
      totalStudents: students.count,
      totalBatches: batches.count,
      totalProjects: projects.count,
      totalTasks: tasks.count
    };
  }
}

module.exports = Course;
