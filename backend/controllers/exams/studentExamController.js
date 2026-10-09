const examSessionService = require('../../services/examSessionService');
const answerSyncService = require('../../services/answerSyncService');
const securityViolationService = require('../../services/securityViolationService');

async function verifyOtp(req, res) {
  try {
    const { assignmentCode, otp } = req.body;
    if (!assignmentCode || !otp) {
      return res.status(400).json({ success: false, message: 'Assignment code and OTP passcode are required.' });
    }

    const data = await examSessionService.verifyCandidateOTP(assignmentCode, otp, req.ip, req.headers['user-agent']);
    res.json({ success: true, data });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
}

async function syncAnswers(req, res) {
  try {
    const { sessionToken, answers } = req.body;
    if (!sessionToken) {
      return res.status(400).json({ success: false, message: 'Session token required.' });
    }

    const result = await answerSyncService.syncAnswers(sessionToken, answers);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function reportViolation(req, res) {
  try {
    const { sessionToken, violationType, details, clientTimestamp } = req.body;
    if (!sessionToken || !violationType) {
      return res.status(400).json({ success: false, message: 'Session token and violation type required.' });
    }

    const result = await securityViolationService.recordViolation(sessionToken, violationType, details, clientTimestamp);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function submitExam(req, res) {
  try {
    const { sessionToken } = req.body;
    if (!sessionToken) {
      return res.status(400).json({ success: false, message: 'Session token required.' });
    }

    const result = await securityViolationService.submitExam(sessionToken);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

module.exports = {
  verifyOtp,
  syncAnswers,
  reportViolation,
  submitExam
};
