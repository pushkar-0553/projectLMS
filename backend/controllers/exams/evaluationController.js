const evaluationService = require('../../services/evaluationService');

async function getCandidateSubmission(req, res) {
  try {
    const data = await evaluationService.getCandidateSubmissionForEvaluation(req.params.candidateId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
}

async function saveQuestionEvaluation(req, res) {
  try {
    const { candidateId, questionId, marksAwarded, feedback } = req.body;
    const result = await evaluationService.saveQuestionEvaluation(candidateId, questionId, marksAwarded, feedback, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function finalizeCandidateResult(req, res) {
  try {
    const result = await evaluationService.finalizeCandidateResult(req.params.candidateId, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function publishAssignmentResults(req, res) {
  try {
    const result = await evaluationService.publishAssignmentResults(req.params.assignmentId, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

module.exports = {
  getCandidateSubmission,
  saveQuestionEvaluation,
  finalizeCandidateResult,
  publishAssignmentResults
};
