const pool = require('../config/db');

class StepProgress {
  // Get user's progress for a specific step
  static async getUserStepProgress(userId, stepId, projectId) {
    const [rows] = await pool.execute(
      'SELECT * FROM StepProgress WHERE user_id = ? AND step_id = ? AND project_id = ?',
      [userId, stepId, projectId]
    );
    return rows[0];
  }

  // Mark a step as completed
  static async completeStep(userId, stepId, projectId) {
    // First check if previous step is completed (enforce order)
    const [stepInfo] = await pool.execute(
      'SELECT step_order FROM Steps WHERE id = ? AND project_id = ?',
      [stepId, projectId]
    );

    if (stepInfo.length === 0) {
      throw new Error('Step not found');
    }

    const currentStepOrder = stepInfo[0].step_order;
    
    // If not the first step, check if previous step is completed
    if (currentStepOrder > 1) {
      const [previousStep] = await pool.execute(
        'SELECT id FROM Steps WHERE project_id = ? AND step_order = ?',
        [projectId, currentStepOrder - 1]
      );

      if (previousStep.length > 0) {
        const [previousStepProgress] = await pool.execute(
          'SELECT completed FROM StepProgress WHERE user_id = ? AND step_id = ? AND project_id = ?',
          [userId, previousStep[0].id, projectId]
        );

        if (previousStepProgress.length === 0 || !previousStepProgress[0].completed) {
          throw new Error('Previous step must be completed first');
        }
      }
    }

    // Complete the current step
    const [result] = await pool.execute(
      `INSERT INTO StepProgress (user_id, step_id, project_id, completed, completion_time, attempts)
       VALUES (?, ?, ?, TRUE, NOW(), attempts + 1)
       ON DUPLICATE KEY UPDATE 
       completed = TRUE, 
       completion_time = NOW(), 
       attempts = attempts + 1,
       last_attempt = NOW()`,
      [userId, stepId, projectId]
    );

    // Update overall project progress
    await this.updateProjectProgress(userId, projectId);

    return result.insertId || stepId;
  }

  // Get all completed steps for a user in a project
  static async getCompletedSteps(userId, projectId) {
    const [rows] = await pool.execute(
      `SELECT sp.*, s.step_order, s.title 
       FROM StepProgress sp 
       JOIN Steps s ON sp.step_id = s.id 
       WHERE sp.user_id = ? AND sp.project_id = ? AND sp.completed = TRUE
       ORDER BY s.step_order`,
      [userId, projectId]
    );
    return rows;
  }

  // Get current step for user in project
  static async getCurrentStep(userId, projectId) {
    // Get all steps for the project
    const [allSteps] = await pool.execute(
      'SELECT * FROM Steps WHERE project_id = ? ORDER BY step_order',
      [projectId]
    );

    // Get completed steps
    const completedSteps = await this.getCompletedSteps(userId, projectId);
    const completedStepIds = new Set(completedSteps.map(s => s.step_id));

    // Find the first uncompleted step
    for (const step of allSteps) {
      if (!completedStepIds.has(step.id)) {
        return step;
      }
    }

    // All steps completed
    return null;
  }

  // Update overall project progress
  static async updateProjectProgress(userId, projectId) {
    // Get total steps count
    const [totalSteps] = await pool.execute(
      'SELECT COUNT(*) as count FROM Steps WHERE project_id = ?',
      [projectId]
    );

    // Get completed steps count
    const [completedSteps] = await pool.execute(
      'SELECT COUNT(*) as count FROM StepProgress WHERE user_id = ? AND project_id = ? AND completed = TRUE',
      [userId, projectId]
    );

    const total = totalSteps[0].count;
    const completed = completedSteps[0].count;
    const isCompleted = total === completed && total > 0;

    // Get completed step IDs for JSON storage
    const completedStepIds = await this.getCompletedSteps(userId, projectId);
    const currentStep = await this.getCurrentStep(userId, projectId);

    // Update Progress table
    await pool.execute(
      `INSERT INTO Progress (user_id, project_id, step_completed, project_completed, completed_steps, current_step, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       step_completed = ?, 
       project_completed = ?, 
       completed_steps = ?, 
       current_step = ?,
       completed_at = ?,
       updated_at = NOW()`,
      [
        userId, projectId, completed, isCompleted, 
        JSON.stringify(completedStepIds.map(s => s.step_id)), 
        currentStep ? currentStep.step_order : null,
        isCompleted ? new Date() : null,
        completed, isCompleted, 
        JSON.stringify(completedStepIds.map(s => s.step_id)), 
        currentStep ? currentStep.step_order : null,
        isCompleted ? new Date() : null
      ]
    );

    return { total, completed, isCompleted, currentStep };
  }

  // Check if user can access a step
  static async canAccessStep(userId, stepId, projectId) {
    const [stepInfo] = await pool.execute(
      'SELECT step_order FROM Steps WHERE id = ? AND project_id = ?',
      [stepId, projectId]
    );

    if (stepInfo.length === 0) {
      return false;
    }

    const currentStepOrder = stepInfo[0].step_order;
    
    // First step is always accessible
    if (currentStepOrder === 1) {
      return true;
    }

    // Check if previous step is completed
    const [previousStep] = await pool.execute(
      'SELECT id FROM Steps WHERE project_id = ? AND step_order = ?',
      [projectId, currentStepOrder - 1]
    );

    if (previousStep.length === 0) {
      return true; // No previous step, so this is accessible
    }

    const [previousStepProgress] = await pool.execute(
      'SELECT completed FROM StepProgress WHERE user_id = ? AND step_id = ? AND project_id = ?',
      [userId, previousStep[0].id, projectId]
    );

    return previousStepProgress.length > 0 && previousStepProgress[0].completed;
  }

  // Get user's progress percentage for a project
  static async getProgressPercentage(userId, projectId) {
    const [result] = await pool.execute(
      `SELECT 
        (SELECT COUNT(*) FROM Steps WHERE project_id = ?) as total_steps,
        (SELECT COUNT(*) FROM StepProgress WHERE user_id = ? AND project_id = ? AND completed = TRUE) as completed_steps`,
      [projectId, userId, projectId]
    );

    const total = result[0].total_steps;
    const completed = result[0].completed_steps;

    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }
}

module.exports = StepProgress;
