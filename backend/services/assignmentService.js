const db = require('../config/db');
const crypto = require('crypto');
const { decrypt } = require('../config/crypto');
const { createCandidateSnapshots } = require('./stageDbService');
const { logAudit } = require('./auditService');

function generateAssignmentCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'EXAM-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return code;
}

/**
 * List all assignments with batch and paper version info (with optional course filtering)
 */
async function listAssignments({ status = null, courseId = null, courseSlug = null } = {}) {
  let sql = `
    SELECT 
      ea.*,
      pv.version_number,
      p.title as paper_title,
      p.subject,
      b.name as batch_name,
      c.id as course_id,
      c.name as course_name,
      c.slug as course_slug,
      (SELECT COUNT(*) FROM exam_assignment_candidates eac WHERE eac.assignment_id = ea.id) as candidate_count,
      (SELECT COUNT(*) FROM exam_assignment_candidates eac WHERE eac.assignment_id = ea.id AND eac.status IN ('SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED')) as submitted_count
    FROM exam_assignments ea
    JOIN exam_paper_versions pv ON ea.paper_version_id = pv.id
    JOIN exam_papers p ON pv.paper_id = p.id
    JOIN Batches b ON ea.batch_id = b.id
    LEFT JOIN Courses c ON b.course_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND ea.status = ?';
    params.push(status);
  }
  if (courseId) {
    sql += ' AND b.course_id = ?';
    params.push(courseId);
  } else if (courseSlug) {
    sql += ' AND (c.slug = ? OR c.code = ?)';
    params.push(courseSlug, courseSlug);
  }

  sql += ' ORDER BY ea.created_at DESC';
  const [rows] = await db.query(sql, params);
  return rows;
}

/**
 * Create a new exam assignment (Paper Version + Batch Binding)
 */
async function createAssignment(data, userId) {
  const {
    paperVersionId,
    batchId,
    title,
    instructions = '',
    scheduledStart = null,
    scheduledEnd = null,
    durationMinutes = 60,
    totalMarks = 100,
    passMarks = 40,
    selectedStudentIds = null
  } = data;

  const assignmentCode = generateAssignmentCode();

  const [result] = await db.query(`
    INSERT INTO exam_assignments 
      (assignment_code, paper_version_id, batch_id, title, instructions, scheduled_start, scheduled_end, duration_minutes, total_marks, pass_marks, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?)
  `, [assignmentCode, paperVersionId, batchId, title, instructions, scheduledStart, scheduledEnd, durationMinutes, totalMarks, passMarks, userId]);

  const assignmentId = result.insertId;

  // Generate candidate snapshots and OTPs from Stage DB
  const candidates = await createCandidateSnapshots(assignmentId, batchId, selectedStudentIds);

  await logAudit({
    actorType: 'ADMIN',
    actorId: userId,
    action: 'EXAM_ASSIGNMENT_CREATED',
    entityType: 'EXAM_ASSIGNMENT',
    entityId: assignmentId,
    payload: { assignmentCode, batchId, paperVersionId, candidateCount: candidates.length }
  });

  return { assignmentId, assignmentCode, candidateCount: candidates.length, candidates };
}

/**
 * Get detailed assignment information
 */
async function getAssignmentById(assignmentId) {
  const [rows] = await db.query(`
    SELECT 
      ea.*,
      pv.version_number,
      pv.content_snapshot_json,
      p.title as paper_title,
      p.subject,
      b.name as batch_name,
      c.name as course_name
    FROM exam_assignments ea
    JOIN exam_paper_versions pv ON ea.paper_version_id = pv.id
    JOIN exam_papers p ON pv.paper_id = p.id
    JOIN Batches b ON ea.batch_id = b.id
    LEFT JOIN Courses c ON b.course_id = c.id
    WHERE ea.id = ?
  `, [assignmentId]);

  if (rows.length === 0) return null;
  const assignment = rows[0];

  const [candidates] = await db.query(`
    SELECT 
      eac.id,
      eac.assignment_id,
      eac.student_id,
      eac.snapshot_student_name,
      eac.snapshot_student_email,
      eac.snapshot_batch_name,
      eac.status as candidate_status,
      eac.invited_at,
      eo.encrypted_otp,
      eo.otp_iv,
      eo.otp_tag,
      es.status as session_status,
      es.started_at,
      es.submitted_at,
      es.violation_count,
      es.submission_type,
      er.total_marks_awarded,
      er.percentage,
      er.is_passed,
      er.status as result_status,
      latest_ej.id as email_job_id,
      latest_ej.status as email_status,
      latest_ej.sent_at as email_sent_at,
      latest_ej.opened_at as email_opened_at,
      latest_ej.last_error as email_last_error,
      latest_ej.attempt_count as email_attempt_count
    FROM exam_assignment_candidates eac
    LEFT JOIN exam_otps eo ON eo.candidate_id = eac.id
    LEFT JOIN exam_sessions es ON es.candidate_id = eac.id
    LEFT JOIN exam_results er ON er.candidate_id = eac.id
    LEFT JOIN (
      SELECT ej1.*
      FROM email_jobs ej1
      INNER JOIN (
        SELECT candidate_id, MAX(id) as max_id
        FROM email_jobs
        GROUP BY candidate_id
      ) ej2 ON ej1.id = ej2.max_id
    ) latest_ej ON latest_ej.candidate_id = eac.id
    WHERE eac.assignment_id = ?
    ORDER BY eac.snapshot_student_name ASC
  `, [assignmentId]);

  assignment.candidates = candidates.map(c => {
    let candidateOtp = null;
    if (c.encrypted_otp && c.otp_iv && c.otp_tag) {
      try {
        candidateOtp = decrypt(c.encrypted_otp, c.otp_iv, c.otp_tag);
      } catch (err) {}
    }

    // Normalized mail delivery status: 'NOT_SENT' | 'ON_THE_WAY' | 'REACHED' | 'OPENED' | 'FAILED'
    let mailStatus = 'NOT_SENT';
    if (c.email_status === 'OPENED') {
      mailStatus = 'OPENED';
    } else if (['SENT', 'DELIVERED'].includes(c.email_status)) {
      mailStatus = 'REACHED';
    } else if (['QUEUED', 'PROCESSING', 'RETRY_PENDING'].includes(c.email_status)) {
      mailStatus = 'ON_THE_WAY';
    } else if (c.email_status === 'FAILED') {
      mailStatus = 'FAILED';
    }

    const { encrypted_otp, otp_iv, otp_tag, ...rest } = c;
    return { 
      ...rest, 
      otp: candidateOtp,
      mail_status: mailStatus,
      mail_sent_at: c.email_sent_at,
      mail_opened_at: c.email_opened_at,
      mail_last_error: c.email_last_error,
      mail_attempt_count: c.email_attempt_count
    };
  });
  return assignment;
}

/**
 * Update assignment status
 */
async function updateAssignmentStatus(assignmentId, status, userId) {
  await db.query(`UPDATE exam_assignments SET status = ? WHERE id = ?`, [status, assignmentId]);

  await logAudit({
    actorType: 'ADMIN',
    actorId: userId,
    action: `ASSIGNMENT_STATUS_${status}`,
    entityType: 'EXAM_ASSIGNMENT',
    entityId: assignmentId
  });

  return { success: true, status };
}

module.exports = {
  listAssignments,
  createAssignment,
  getAssignmentById,
  updateAssignmentStatus
};
