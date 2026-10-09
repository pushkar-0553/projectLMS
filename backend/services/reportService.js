const db = require('../config/db');

/**
 * Generate comprehensive report for an exam assignment
 */
async function getExamAssignmentReport(assignmentId) {
  const [candidates] = await db.query(`
    SELECT 
      eac.id as candidate_id,
      eac.student_id,
      eac.snapshot_student_name as student_name,
      eac.snapshot_student_email as student_email,
      eac.snapshot_batch_name as batch_name,
      eac.status as candidate_status,
      es.status as session_status,
      es.started_at,
      es.submitted_at,
      es.submission_type,
      es.violation_count,
      er.total_marks_possible,
      er.total_marks_awarded,
      er.percentage,
      er.is_passed,
      er.status as result_status
    FROM exam_assignment_candidates eac
    LEFT JOIN exam_sessions es ON es.candidate_id = eac.id
    LEFT JOIN exam_results er ON er.candidate_id = eac.id
    WHERE eac.assignment_id = ?
    ORDER BY er.percentage DESC, eac.snapshot_student_name ASC
  `, [assignmentId]);

  // Aggregate statistics
  let totalCandidates = candidates.length;
  let attendedCount = 0;
  let submittedCount = 0;
  let evaluatedCount = 0;
  let passedCount = 0;
  let totalScoreSum = 0;
  let highestScore = 0;

  candidates.forEach(c => {
    if (c.session_status && c.session_status !== 'NOT_STARTED') attendedCount++;
    if (['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'].includes(c.candidate_status)) submittedCount++;
    if (c.result_status === 'PUBLISHED' || c.total_marks_awarded !== null) {
      evaluatedCount++;
      const score = parseFloat(c.total_marks_awarded || 0);
      totalScoreSum += score;
      if (score > highestScore) highestScore = score;
      if (c.is_passed) passedCount++;
    }
  });

  const avgScore = evaluatedCount > 0 ? (totalScoreSum / evaluatedCount).toFixed(2) : 0;
  const passRate = evaluatedCount > 0 ? ((passedCount / evaluatedCount) * 100).toFixed(1) : 0;

  return {
    candidates,
    stats: {
      totalCandidates,
      attendedCount,
      submittedCount,
      evaluatedCount,
      passedCount,
      avgScore,
      highestScore,
      passRate
    }
  };
}

/**
 * Generate CSV representation of exam results
 */
function convertCandidatesToCSV(candidates) {
  const headers = [
    'Candidate ID',
    'Student ID',
    'Name',
    'Email',
    'Batch',
    'Status',
    'Violations',
    'Submission Type',
    'Score Awarded',
    'Total Possible',
    'Percentage (%)',
    'Result'
  ];

  const rows = candidates.map(c => [
    c.candidate_id,
    c.student_id,
    `"${(c.student_name || '').replace(/"/g, '""')}"`,
    c.student_email,
    `"${(c.batch_name || '').replace(/"/g, '""')}"`,
    c.candidate_status,
    c.violation_count || 0,
    c.submission_type || 'N/A',
    c.total_marks_awarded !== null ? c.total_marks_awarded : 'Pending',
    c.total_marks_possible || 'N/A',
    c.percentage !== null ? c.percentage : 'N/A',
    c.is_passed !== null ? (c.is_passed ? 'PASSED' : 'FAILED') : 'PENDING'
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  return csvContent;
}

/**
 * Get Security Audit report (all candidates with violations)
 */
async function getSecurityViolationReport(assignmentId = null) {
  let sql = `
    SELECT 
      esv.*,
      es.session_token,
      es.violation_count as total_session_violations,
      es.status as session_status,
      eac.snapshot_student_name as student_name,
      eac.snapshot_student_email as student_email,
      eac.snapshot_batch_name as batch_name,
      ea.title as exam_title
    FROM exam_security_violations esv
    JOIN exam_sessions es ON esv.session_id = es.id
    JOIN exam_assignment_candidates eac ON es.candidate_id = eac.id
    JOIN exam_assignments ea ON es.assignment_id = ea.id
    WHERE 1=1
  `;
  const params = [];

  if (assignmentId) {
    sql += ' AND ea.id = ?';
    params.push(assignmentId);
  }

  sql += ' ORDER BY esv.recorded_at DESC LIMIT 100';
  const [rows] = await db.query(sql, params);
  return rows;
}

module.exports = {
  getExamAssignmentReport,
  convertCandidatesToCSV,
  getSecurityViolationReport
};
