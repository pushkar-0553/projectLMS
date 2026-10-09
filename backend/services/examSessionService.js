const db = require('../config/db');
const { hashOTP, generateSessionToken } = require('../config/crypto');
const { getVersionDetails } = require('./paperService');
const { logAudit } = require('./auditService');

/**
 * Verify candidate OTP and initialize/restore exam session
 */
async function verifyCandidateOTP(assignmentCode, rawOtp, clientIp = null, userAgent = null) {
  const cleanCode = assignmentCode.trim().toUpperCase();
  const cleanOtp = rawOtp.trim();

  // 1. Fetch assignment
  const [assignments] = await db.query(`
    SELECT ea.*, pv.id as paper_version_id
    FROM exam_assignments ea
    JOIN exam_paper_versions pv ON ea.paper_version_id = pv.id
    WHERE ea.assignment_code = ?
  `, [cleanCode]);

  if (assignments.length === 0) {
    throw new Error('Invalid examination code.');
  }
  const assignment = assignments[0];

  // 2. Find matching candidate by testing OTP against all candidates for this assignment
  const [candidates] = await db.query(`
    SELECT eac.*, eo.id as otp_id, eo.otp_hash, eo.otp_salt, eo.expires_at, eo.attempt_count, eo.max_attempts
    FROM exam_assignment_candidates eac
    JOIN exam_otps eo ON eo.candidate_id = eac.id
    WHERE eac.assignment_id = ?
  `, [assignment.id]);

  let matchedCandidate = null;

  for (const c of candidates) {
    if (c.attempt_count >= c.max_attempts) continue;
    if (new Date(c.expires_at) < new Date()) continue;

    const testHash = hashOTP(cleanOtp, c.otp_salt);
    if (testHash === c.otp_hash) {
      matchedCandidate = c;
      break;
    }
  }

  if (!matchedCandidate) {
    // Record failed attempt on candidates if feasible or throw error
    throw new Error('Invalid or expired OTP. Please check your passcode and try again.');
  }

  // 3. Check existing session for recovery
  const [existingSessions] = await db.query(`
    SELECT * FROM exam_sessions WHERE candidate_id = ?
  `, [matchedCandidate.id]);

  let session = null;

  if (existingSessions.length > 0) {
    session = existingSessions[0];
    if (['SUBMITTED', 'AUTO_SUBMITTED'].includes(session.status)) {
      throw new Error('This examination has already been submitted and finalized.');
    }
    // Update last activity
    await db.query(`UPDATE exam_sessions SET last_activity_at = NOW(), client_ip = ?, user_agent = ? WHERE id = ?`, [clientIp, userAgent, session.id]);
  } else {
    // Create new session
    const sessionToken = generateSessionToken();
    const durationMinutes = assignment.duration_minutes;
    const now = new Date();
    const expectedEnd = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const [sessResult] = await db.query(`
      INSERT INTO exam_sessions 
        (candidate_id, assignment_id, session_token, started_at, expected_end_at, status, violation_count, client_ip, user_agent)
      VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', 0, ?, ?)
    `, [matchedCandidate.id, assignment.id, sessionToken, now, expectedEnd, clientIp, userAgent]);

    await db.query(`
      UPDATE exam_assignment_candidates 
      SET status = 'IN_PROGRESS' 
      WHERE id = ?
    `, [matchedCandidate.id]);

    session = {
      id: sessResult.insertId,
      candidate_id: matchedCandidate.id,
      assignment_id: assignment.id,
      session_token: sessionToken,
      started_at: now,
      expected_end_at: expectedEnd,
      status: 'IN_PROGRESS',
      violation_count: 0
    };

    await logAudit({
      actorType: 'STUDENT',
      actorId: matchedCandidate.student_id,
      action: 'EXAM_SESSION_STARTED',
      entityType: 'EXAM_SESSION',
      entityId: session.id,
      payload: { candidateName: matchedCandidate.snapshot_student_name, assignmentCode },
      ipAddress: clientIp
    });
  }

  // 4. Retrieve paper content (sanitized for candidate - NO answer keys or explanations)
  const fullPaper = await getVersionDetails(assignment.paper_version_id);
  const sanitizedSections = (fullPaper.sections || []).map(sec => ({
    id: sec.id,
    title: sec.title,
    description: sec.description,
    instructions: sec.instructions,
    total_marks: sec.total_marks,
    questions: (sec.questions || []).map(q => ({
      id: q.id,
      question_order: q.question_order,
      question_type: q.question_type,
      difficulty: q.difficulty,
      question_text: q.question_text,
      options: q.options,
      marks: q.marks,
      attachment_url: q.attachment_url
      // Excludes answer_key and explanation!
    }))
  }));

  // 5. Retrieve existing saved answers for this session
  const [answers] = await db.query(`
    SELECT question_id, answer_text, selected_option, version, client_updated_at, server_synced_at
    FROM exam_answers
    WHERE session_id = ?
  `, [session.id]);

  const nowMs = Date.now();
  const endMs = new Date(session.expected_end_at).getTime();
  const remainingSeconds = Math.max(0, Math.floor((endMs - nowMs) / 1000));

  return {
    sessionToken: session.session_token,
    sessionId: session.id,
    candidate: {
      id: matchedCandidate.id,
      studentId: matchedCandidate.student_id,
      name: matchedCandidate.snapshot_student_name,
      email: matchedCandidate.snapshot_student_email,
      batch: matchedCandidate.snapshot_batch_name
    },
    assignment: {
      id: assignment.id,
      code: assignment.assignment_code,
      title: assignment.title,
      instructions: assignment.instructions,
      durationMinutes: assignment.duration_minutes,
      totalMarks: assignment.total_marks
    },
    timing: {
      startedAt: session.started_at,
      expectedEndAt: session.expected_end_at,
      remainingSeconds,
      serverTime: new Date()
    },
    sections: sanitizedSections,
    savedAnswers: answers,
    violationCount: session.violation_count
  };
}

/**
 * Validate active session by token
 */
async function getSessionByToken(sessionToken) {
  const [sessions] = await db.query(`
    SELECT es.*, eac.snapshot_student_name, eac.snapshot_student_email, ea.assignment_code, ea.title as exam_title
    FROM exam_sessions es
    JOIN exam_assignment_candidates eac ON es.candidate_id = eac.id
    JOIN exam_assignments ea ON es.assignment_id = ea.id
    WHERE es.session_token = ?
  `, [sessionToken]);

  if (sessions.length === 0) return null;
  return sessions[0];
}

module.exports = {
  verifyCandidateOTP,
  getSessionByToken
};
