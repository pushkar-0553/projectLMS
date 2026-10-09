const db = require('../config/db');

/**
 * Synchronize batch answers from client (Autosave & Conflict Resolution)
 */
async function syncAnswers(sessionToken, answers = []) {
  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return { syncedCount: 0, serverSyncedAt: new Date() };
  }

  // 1. Validate session
  const [sessions] = await db.query(`
    SELECT id, status, expected_end_at FROM exam_sessions WHERE session_token = ?
  `, [sessionToken]);

  if (sessions.length === 0) {
    throw new Error('Invalid examination session.');
  }

  const session = sessions[0];
  if (['SUBMITTED', 'AUTO_SUBMITTED'].includes(session.status)) {
    throw new Error('Examination has already been finalized. New answers cannot be accepted.');
  }

  // Check server-authoritative timer expiry
  if (new Date(session.expected_end_at).getTime() < Date.now()) {
    // Flag as expired or auto-submit
    await db.query(`
      UPDATE exam_sessions 
      SET status = 'AUTO_SUBMITTED', submission_type = 'TIMEOUT', submitted_at = NOW() 
      WHERE id = ?
    `, [session.id]);
    throw new Error('Examination time has expired. Your submission has been automatically processed.');
  }

  let syncedCount = 0;

  for (const item of answers) {
    const { questionId, answerText = null, selectedOption = null, version = 1, clientUpdatedAt = null } = item;
    if (!questionId) continue;

    // Check existing answer
    const [existing] = await db.query(`
      SELECT id, version, client_updated_at FROM exam_answers 
      WHERE session_id = ? AND question_id = ?
    `, [session.id, questionId]);

    const formattedClientTime = clientUpdatedAt ? new Date(clientUpdatedAt) : new Date();

    if (existing.length === 0) {
      // Insert new
      await db.query(`
        INSERT INTO exam_answers 
          (session_id, question_id, answer_text, selected_option, version, client_updated_at, server_synced_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [session.id, questionId, answerText, selectedOption, version, formattedClientTime]);
      syncedCount++;
    } else {
      const current = existing[0];
      // Deterministic conflict resolution: update if incoming version >= current version
      if (version >= current.version) {
        await db.query(`
          UPDATE exam_answers 
          SET answer_text = ?, 
              selected_option = ?, 
              version = ?, 
              client_updated_at = ?, 
              server_synced_at = NOW()
          WHERE id = ?
        `, [answerText, selectedOption, version, formattedClientTime, current.id]);
        syncedCount++;
      }
    }
  }

  // Update session heartbeat
  await db.query(`UPDATE exam_sessions SET last_activity_at = NOW() WHERE id = ?`, [session.id]);

  return {
    syncedCount,
    serverSyncedAt: new Date()
  };
}

module.exports = {
  syncAnswers
};
