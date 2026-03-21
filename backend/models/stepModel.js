const pool = require('../config/db');

class Step {
  static async getByProjectId(projectId) {
    const [rows] = await pool.execute(
      'SELECT * FROM Steps WHERE project_id = ? ORDER BY step_order',
      [projectId]
    );
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM Steps WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async create(projectId, title, explanation, codeSnippet = null, stepOrder, expectedOutput = null, hints = null, images = null) {
    const imagesJson = images ? JSON.stringify(images) : null;
    const [result] = await pool.execute(
      'INSERT INTO Steps (project_id, title, explanation, code_snippet, step_order, expected_output, hints, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [projectId, title, explanation, codeSnippet, stepOrder, expectedOutput, hints, imagesJson]
    );
    return result.insertId;
  }

  static async update(id, title, explanation, codeSnippet = null, stepOrder, expectedOutput = null, hints = null, images = null) {
    const imagesJson = images ? JSON.stringify(images) : null;
    const [result] = await pool.execute(
      'UPDATE Steps SET title = ?, explanation = ?, code_snippet = ?, step_order = ?, expected_output = ?, hints = ?, images = ? WHERE id = ?',
      [title, explanation, codeSnippet, stepOrder, expectedOutput, hints, imagesJson, id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.execute(
      'DELETE FROM Steps WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async getStepCount(projectId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM Steps WHERE project_id = ?',
      [projectId]
    );
    return rows[0].count;
  }

  // Get steps with user progress
  static async getWithUserProgress(userId, projectId) {
    const [rows] = await pool.execute(
      `SELECT 
        s.*,
        COALESCE(sp.completed, FALSE) as is_completed,
        COALESCE(sp.attempts, 0) as attempts,
        COALESCE(sp.completion_time, NULL) as completion_time
      FROM Steps s
      LEFT JOIN StepProgress sp ON s.id = sp.step_id AND sp.user_id = ?
      WHERE s.project_id = ?
      ORDER BY s.step_order`,
      [userId, projectId]
    );
    return rows;
  }

  // Get next step for user
  static async getNextStep(userId, projectId) {
    const [rows] = await pool.execute(
      `SELECT s.*,
         COALESCE(sp.completed, FALSE) as is_completed
      FROM Steps s
      LEFT JOIN StepProgress sp ON s.id = sp.step_id AND sp.user_id = ?
      WHERE s.project_id = ? AND (sp.completed IS NULL OR sp.completed = FALSE)
      ORDER BY s.step_order
      LIMIT 1`,
      [userId, projectId]
    );
    return rows[0];
  }

  // Get completed steps count
  static async getCompletedCount(userId, projectId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM StepProgress WHERE user_id = ? AND project_id = ? AND completed = TRUE',
      [userId, projectId]
    );
    return rows[0].count;
  }
}

module.exports = Step;
