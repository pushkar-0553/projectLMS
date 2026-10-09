const db = require('../config/db');
const { logAudit } = require('./auditService');

const MAX_VIOLATIONS = 3;

/**
 * Record a security violation event (Fullscreen exit, tab switch, window blur, paste)
 */
async function recordViolation(sessionToken, violationType, details = '', clientTimestamp = null) {
  const [sessions] = await db.query(`
    SELECT es.*, eac.snapshot_student_name, eac.student_id, eac.id as candidate_id
    FROM exam_sessions es
    JOIN exam_assignment_candidates eac ON es.candidate_id = eac.id
    WHERE es.session_token = ?
  `, [sessionToken]);

  if (sessions.length === 0) {
    throw new Error('Invalid examination session.');
  }

  const session = sessions[0];
  if (['SUBMITTED', 'AUTO_SUBMITTED'].includes(session.status)) {
    return {
      violationCount: session.violation_count,
      autoSubmitted: true,
      warningsLeft: 0,
      message: 'Examination already finalized.'
    };
  }

  const newViolationCount = session.violation_count + 1;
  const autoSubmitted = newViolationCount >= MAX_VIOLATIONS;

  // Insert into exam_security_violations ledger
  await db.query(`
    INSERT INTO exam_security_violations 
      (session_id, violation_type, violation_sequence, details, client_timestamp, recorded_at)
    VALUES (?, ?, ?, ?, ?, NOW())
  `, [session.id, violationType, newViolationCount, details, clientTimestamp ? new Date(clientTimestamp) : new Date()]);

  if (autoSubmitted) {
    // 3rd Violation: Auto-Submit Exam
    await db.query(`
      UPDATE exam_sessions 
      SET violation_count = ?, 
          status = 'AUTO_SUBMITTED', 
          submission_type = 'VIOLATION', 
          submitted_at = NOW() 
      WHERE id = ?
    `, [newViolationCount, session.id]);

    await db.query(`
      UPDATE exam_assignment_candidates 
      SET status = 'AUTO_SUBMITTED' 
      WHERE id = ?
    `, [session.candidate_id]);

    await db.query(`
      UPDATE exam_answers 
      SET is_final = 1 
      WHERE session_id = ?
    `, [session.id]);

    await logAudit({
      actorType: 'SYSTEM',
      actorId: session.student_id,
      action: 'EXAM_AUTO_SUBMITTED_VIOLATIONS',
      entityType: 'EXAM_SESSION',
      entityId: session.id,
      payload: { candidateName: session.snapshot_student_name, violationCount: newViolationCount, lastViolation: violationType }
    });

    return {
      violationCount: newViolationCount,
      autoSubmitted: true,
      warningsLeft: 0,
      message: 'Maximum security violations (3/3) exceeded. Examination automatically locked and submitted.'
    };
  } else {
    // Warning 1 or 2
    await db.query(`
      UPDATE exam_sessions 
      SET violation_count = ? 
      WHERE id = ?
    `, [newViolationCount, session.id]);

    await logAudit({
      actorType: 'STUDENT',
      actorId: session.student_id,
      action: 'SECURITY_WARNING_TRIGGERED',
      entityType: 'EXAM_SESSION',
      entityId: session.id,
      payload: { candidateName: session.snapshot_student_name, violationCount: newViolationCount, violationType }
    });

    return {
      violationCount: newViolationCount,
      autoSubmitted: false,
      warningsLeft: MAX_VIOLATIONS - newViolationCount,
      message: `Security violation detected (${newViolationCount}/${MAX_VIOLATIONS}): ${violationType}. Please return to fullscreen examination immediately.`
    };
  }
}

/**
 * Handle student manual exam submission
 */
async function submitExam(sessionToken) {
  const [sessions] = await db.query(`
    SELECT es.*, eac.snapshot_student_name, eac.student_id, eac.id as candidate_id
    FROM exam_sessions es
    JOIN exam_assignment_candidates eac ON es.candidate_id = eac.id
    WHERE es.session_token = ?
  `, [sessionToken]);

  if (sessions.length === 0) throw new Error('Invalid examination session.');
  const session = sessions[0];

  if (['SUBMITTED', 'AUTO_SUBMITTED'].includes(session.status)) {
    return { success: true, message: 'Examination was already submitted.', submittedAt: session.submitted_at };
  }

  const now = new Date();

  await db.query(`
    UPDATE exam_sessions 
    SET status = 'SUBMITTED', 
        submission_type = 'MANUAL', 
        submitted_at = ? 
    WHERE id = ?
  `, [now, session.id]);

  await db.query(`
    UPDATE exam_assignment_candidates 
    SET status = 'SUBMITTED' 
    WHERE id = ?
  `, [session.candidate_id]);

  await db.query(`
    UPDATE exam_answers 
    SET is_final = 1 
    WHERE session_id = ?
  `, [session.id]);

  await logAudit({
    actorType: 'STUDENT',
    actorId: session.student_id,
    action: 'EXAM_MANUALLY_SUBMITTED',
    entityType: 'EXAM_SESSION',
    entityId: session.id,
    payload: { candidateName: session.snapshot_student_name }
  });

  return { success: true, message: 'Examination submitted successfully!', submittedAt: now };
}

module.exports = {
  recordViolation,
  submitExam
};
