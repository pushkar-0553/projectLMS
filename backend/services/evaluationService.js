const db = require('../config/db');
const { getVersionDetails } = require('./paperService');
const { logAudit } = require('./auditService');

/**
 * Get candidate submission details for evaluation
 */
async function getCandidateSubmissionForEvaluation(candidateId) {
  // 1. Fetch candidate, assignment, and paper version
  const [candidates] = await db.query(`
    SELECT 
      eac.*,
      ea.id as assignment_id,
      ea.title as assignment_title,
      ea.paper_version_id,
      ea.total_marks as exam_total_marks,
      ea.pass_marks as exam_pass_marks,
      es.id as session_id,
      es.status as session_status,
      es.started_at,
      es.submitted_at,
      es.submission_type,
      es.violation_count
    FROM exam_assignment_candidates eac
    JOIN exam_assignments ea ON eac.assignment_id = ea.id
    LEFT JOIN exam_sessions es ON es.candidate_id = eac.id
    WHERE eac.id = ?
  `, [candidateId]);

  if (candidates.length === 0) throw new Error('Candidate not found.');
  const candidate = candidates[0];

  // 2. Fetch paper version details (including answer keys and explanations for evaluator)
  let paper = await getVersionDetails(candidate.paper_version_id);
  if (!paper && candidate.paper_version_id) {
    const [latestVersionRow] = await db.query(
      `SELECT id FROM exam_paper_versions WHERE paper_id = ? ORDER BY version_number DESC LIMIT 1`,
      [candidate.paper_version_id]
    );
    if (latestVersionRow.length > 0) {
      paper = await getVersionDetails(latestVersionRow[0].id);
    }
  }

  // 3. Fetch student's submitted answers
  const [answers] = await db.query(`
    SELECT question_id, answer_text, selected_option, code_language, code_content, client_updated_at, server_synced_at
    FROM exam_answers
    WHERE session_id = ?
  `, [candidate.session_id]);

  const answerMap = {};
  answers.forEach(a => { answerMap[a.question_id] = a; });

  // 4. Fetch existing evaluations
  const [evaluations] = await db.query(`
    SELECT question_id, marks_awarded, feedback, evaluator_id, evaluated_at
    FROM exam_evaluations
    WHERE candidate_id = ?
  `, [candidateId]);

  const evalMap = {};
  evaluations.forEach(e => { evalMap[e.question_id] = e; });

  // 5. Merge answers and evaluation into paper sections
  let totalEvaluatedMarks = 0;
  let totalEvaluatedQuestions = 0;
  let totalQuestionsCount = 0;

  const sectionsWithSubmissions = (paper.sections || []).map(sec => {
    const questions = (sec.questions || []).map(q => {
      totalQuestionsCount++;
      const ans = answerMap[q.id] || null;
      const evaluation = evalMap[q.id] || null;

      if (evaluation) {
        totalEvaluatedMarks += parseFloat(evaluation.marks_awarded || 0);
        totalEvaluatedQuestions++;
      }

      return {
        id: q.id,
        questionOrder: q.question_order,
        questionType: q.question_type,
        difficulty: q.difficulty,
        questionText: q.question_text,
        marks: q.marks,
        answerKey: q.answer_key,
        explanation: q.explanation,
        options: q.options,
        studentAnswer: ans ? (ans.answer_text || ans.code_content || ans.selected_option) : null,
        codeContent: ans ? ans.code_content : null,
        codeLanguage: ans ? ans.code_language : null,
        studentAnswerRaw: ans,
        evaluation: evaluation ? {
          marksAwarded: evaluation.marks_awarded,
          feedback: evaluation.feedback,
          evaluatedAt: evaluation.evaluated_at
        } : null
      };
    });

    return {
      ...sec,
      questions
    };
  });

  return {
    candidate,
    paperTitle: paper.title,
    sections: sectionsWithSubmissions,
    summary: {
      totalQuestionsCount,
      totalEvaluatedQuestions,
      isFullyEvaluated: totalQuestionsCount === totalEvaluatedQuestions,
      totalMarksAwarded: totalEvaluatedMarks,
      totalPossibleMarks: candidate.exam_total_marks
    }
  };
}

/**
 * Save evaluation for a single question
 */
async function saveQuestionEvaluation(candidateId, questionId, marksAwarded, feedback, evaluatorId) {
  await db.query(`
    INSERT INTO exam_evaluations 
      (candidate_id, question_id, marks_awarded, feedback, evaluator_id, evaluated_at)
    VALUES (?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE 
      marks_awarded = VALUES(marks_awarded),
      feedback = VALUES(feedback),
      evaluator_id = VALUES(evaluator_id),
      evaluated_at = NOW()
  `, [candidateId, questionId, marksAwarded, feedback, evaluatorId]);

  return { success: true };
}

/**
 * Finalize evaluation and compute result for a candidate
 */
async function finalizeCandidateResult(candidateId, evaluatorId) {
  // 1. Fetch candidate & assignment
  const [candidates] = await db.query(`
    SELECT eac.*, ea.total_marks, ea.pass_marks, ea.id as assignment_id
    FROM exam_assignment_candidates eac
    JOIN exam_assignments ea ON eac.assignment_id = ea.id
    WHERE eac.id = ?
  `, [candidateId]);

  if (candidates.length === 0) throw new Error('Candidate not found.');
  const candidate = candidates[0];

  // 2. Sum awarded marks
  const [[{ totalAwarded }]] = await db.query(`
    SELECT COALESCE(SUM(marks_awarded), 0) as totalAwarded 
    FROM exam_evaluations 
    WHERE candidate_id = ?
  `, [candidateId]);

  const totalPossible = parseFloat(candidate.total_marks || 100);
  const percentage = (parseFloat(totalAwarded) / totalPossible) * 100;
  const passMarks = parseFloat(candidate.pass_marks || 40);
  const isPassed = parseFloat(totalAwarded) >= passMarks ? 1 : 0;

  // 3. Upsert exam_results
  await db.query(`
    INSERT INTO exam_results 
      (candidate_id, assignment_id, total_marks_possible, total_marks_awarded, percentage, is_passed, status)
    VALUES (?, ?, ?, ?, ?, ?, 'DRAFT')
    ON DUPLICATE KEY UPDATE 
      total_marks_possible = VALUES(total_marks_possible),
      total_marks_awarded = VALUES(total_marks_awarded),
      percentage = VALUES(percentage),
      is_passed = VALUES(is_passed),
      updated_at = NOW()
  `, [candidateId, candidate.assignment_id, totalPossible, totalAwarded, percentage.toFixed(2), isPassed]);

  await db.query(`
    UPDATE exam_assignment_candidates 
    SET status = 'EVALUATED' 
    WHERE id = ?
  `, [candidateId]);

  await logAudit({
    actorType: 'COORDINATOR',
    actorId: evaluatorId,
    action: 'CANDIDATE_RESULT_EVALUATED',
    entityType: 'EXAM_RESULT',
    entityId: candidateId,
    payload: { totalAwarded, percentage, isPassed }
  });

  return {
    success: true,
    totalAwarded,
    totalPossible,
    percentage: percentage.toFixed(2),
    isPassed
  };
}

/**
 * Publish all evaluated results for an assignment
 */
async function publishAssignmentResults(assignmentId, userId) {
  await db.query(`
    UPDATE exam_results 
    SET status = 'PUBLISHED', published_at = NOW() 
    WHERE assignment_id = ?
  `, [assignmentId]);

  await db.query(`
    UPDATE exam_assignments 
    SET status = 'PUBLISHED' 
    WHERE id = ?
  `, [assignmentId]);

  await logAudit({
    actorType: 'ADMIN',
    actorId: userId,
    action: 'ASSIGNMENT_RESULTS_PUBLISHED',
    entityType: 'EXAM_ASSIGNMENT',
    entityId: assignmentId
  });

  return { success: true };
}

module.exports = {
  getCandidateSubmissionForEvaluation,
  saveQuestionEvaluation,
  finalizeCandidateResult,
  publishAssignmentResults
};
