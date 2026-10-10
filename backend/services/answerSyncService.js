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

  const validAnswers = answers.filter(a => a && a.questionId);
  if (validAnswers.length === 0) {
    return { syncedCount: 0, serverSyncedAt: new Date() };
  }

  // 2. High-performance batch upsert (single database roundtrip for all answers)
  const values = [];
  const placeholders = [];

  for (const item of validAnswers) {
    const { 
      questionId, 
      answerText = null, 
      selectedOption = null, 
      codeLanguage = null, 
      code_language = null,
      codeContent = null, 
      code_content = null,
      version = 1, 
      clientUpdatedAt = null 
    } = item;

    const resolvedCodeLang = codeLanguage || code_language || null;
    const resolvedCodeContent = codeContent !== undefined ? codeContent : (code_content !== undefined ? code_content : null);
    const formattedClientTime = clientUpdatedAt ? new Date(clientUpdatedAt) : new Date();

    placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, NOW())');
    values.push(
      session.id,
      questionId,
      answerText,
      selectedOption,
      resolvedCodeLang,
      resolvedCodeContent,
      version,
      formattedClientTime
    );
  }

  const upsertSql = `
    INSERT INTO exam_answers 
      (session_id, question_id, answer_text, selected_option, code_language, code_content, version, client_updated_at, server_synced_at)
    VALUES ${placeholders.join(', ')}
    ON DUPLICATE KEY UPDATE
      answer_text = IF(VALUES(version) >= version, VALUES(answer_text), answer_text),
      selected_option = IF(VALUES(version) >= version, VALUES(selected_option), selected_option),
      code_language = IF(VALUES(version) >= version, VALUES(code_language), code_language),
      code_content = IF(VALUES(version) >= version, VALUES(code_content), code_content),
      client_updated_at = IF(VALUES(version) >= version, VALUES(client_updated_at), client_updated_at),
      server_synced_at = IF(VALUES(version) >= version, NOW(), server_synced_at),
      version = IF(VALUES(version) >= version, VALUES(version), version)
  `;

  await db.query(upsertSql, values);

  // Update session heartbeat
  await db.query(`UPDATE exam_sessions SET last_activity_at = NOW() WHERE id = ?`, [session.id]);

  return {
    syncedCount: validAnswers.length,
    serverSyncedAt: new Date()
  };
}

module.exports = {
  syncAnswers
};
