const pool = require('../config/db');

/**
 * Log an activity in the database
 * @param {number} userId - ID of the user performing the action
 * @param {string} role - Role of the user (admin or coordinator)
 * @param {string} actionType - Type of action (e.g., 'CREATE_BATCH', 'ASSIGN_TASK')
 * @param {string} entityType - Type of entity affected ('batch', 'subbatch', 'task', 'submission', 'user')
 * @param {number|null} entityId - ID of the affected entity
 * @param {string} description - Human-readable description of the action
 */
async function logActivity(userId, role, actionType, entityType, entityId, description) {
  try {
    await pool.execute(
      'INSERT INTO ActivityLogs (user_id, role, action_type, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, role, actionType, entityType, entityId, description]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
    // We don't want to throw error and break the main flow if logging fails
  }
}

module.exports = { logActivity };
