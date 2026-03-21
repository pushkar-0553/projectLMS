const pool = require('../config/db');

class Project {
  static async getAll() {
    const [rows] = await pool.execute('SELECT * FROM Projects ORDER BY level, order_index, id');
    return rows;
  }

  static async getByLevel(level) {
    const [rows] = await pool.execute(
      'SELECT * FROM Projects WHERE level = ? ORDER BY order_index, id',
      [level]
    );
    return rows;
  }

  static async getByType(type) {
    const [rows] = await pool.execute(
      'SELECT * FROM Projects WHERE type = ? ORDER BY level, order_index, id',
      [type]
    );
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM Projects WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async create({ title, description, level, difficulty, estimatedTime, orderIndex, prerequisites, type = 'main' }) {
    const [result] = await pool.execute(
      `INSERT INTO Projects 
       (title, description, level, difficulty, estimated_time, order_index, prerequisites, type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, level, difficulty, estimatedTime, orderIndex, JSON.stringify(prerequisites), type]
    );
    return result.insertId;
  }

  static async update(id, { title, description, level, difficulty, estimatedTime, orderIndex, prerequisites, type }) {
    const [result] = await pool.execute(
      'UPDATE Projects SET title = ?, description = ?, level = ?, difficulty = ?, estimated_time = ?, order_index = ?, prerequisites = ?, type = ? WHERE id = ?',
      [title, description, level, difficulty, estimatedTime, orderIndex, JSON.stringify(prerequisites), type, id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.execute(
      'DELETE FROM Projects WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // Get projects with user progress
  static async getWithUserProgress(userId, level = null) {
    let query = `
      SELECT 
        p.*,
        COALESCE(pr.step_completed, 0) as completed_steps,
        COALESCE(pr.project_completed, FALSE) as is_completed,
        COALESCE(pr.current_step, 1) as current_step,
        (SELECT COUNT(*) FROM Steps WHERE project_id = p.id) as total_steps
      FROM Projects p
      LEFT JOIN Progress pr ON p.id = pr.project_id AND pr.user_id = ?
    `;
    
    const params = [userId];
    
    if (level) {
      query += ' WHERE p.level = ?';
      params.push(level);
    }
    
    query += ' ORDER BY p.level, p.order_index, p.id';
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  // Get projects by type with user progress
  static async getByTypeWithProgress(userId, type) {
    const [rows] = await pool.execute(
      `SELECT 
        p.*,
        COALESCE(pr.step_completed, 0) as completed_steps,
        COALESCE(pr.project_completed, FALSE) as is_completed,
        COALESCE(pr.current_step, 1) as current_step,
        (SELECT COUNT(*) FROM Steps WHERE project_id = p.id) as total_steps
      FROM Projects p
      LEFT JOIN Progress pr ON p.id = pr.project_id AND pr.user_id = ?
      WHERE p.type = ?
      ORDER BY p.level, p.order_index, p.id`,
      [userId, type]
    );
    return rows;
  }

  // Check if user can access project (based on prerequisites)
  static async canUserAccess(userId, projectId) {
    const [project] = await pool.execute(
      'SELECT prerequisites FROM Projects WHERE id = ?',
      [projectId]
    );

    if (project.length === 0) return false;
    
    const prerequisites = project[0].prerequisites;
    if (!prerequisites) return true;

    try {
      const prereqArray = JSON.parse(prerequisites);
      if (prereqArray.length === 0) return true;

      const [completedPrereqs] = await pool.execute(
        `SELECT COUNT(*) as completed_count 
         FROM Progress 
         WHERE user_id = ? AND project_id IN (${prereqArray.map(() => '?').join(',')}) AND project_completed = TRUE`,
        [userId, ...prereqArray]
      );

      return completedPrereqs[0].completed_count === prereqArray.length;
    } catch (error) {
      console.error('Error parsing prerequisites:', error);
      return true;
    }
  }

  // Get next recommended project for user
  static async getNextRecommended(userId, currentLevel = null) {
    let query = `
      SELECT p.*,
             COALESCE(pr.project_completed, FALSE) as is_completed
      FROM Projects p
      LEFT JOIN Progress pr ON p.id = pr.project_id AND pr.user_id = ?
      WHERE (pr.project_completed IS NULL OR pr.project_completed = FALSE)
    `;
    
    const params = [userId];
    
    if (currentLevel) {
      query += ' AND p.level = ?';
      params.push(currentLevel);
    }
    
    query += ' ORDER BY p.level, p.order_index, p.id LIMIT 1';
    
    const [rows] = await pool.execute(query, params);
    return rows[0];
  }
}

module.exports = Project;
