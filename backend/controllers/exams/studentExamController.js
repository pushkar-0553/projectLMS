const examSessionService = require('../../services/examSessionService');
const answerSyncService = require('../../services/answerSyncService');
const securityViolationService = require('../../services/securityViolationService');
const searchService = require('../../services/searchService');
const aiService = require('../../services/aiService');

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

async function searchWeb(req, res) {
  try {
    const { sessionToken, query, questionId } = req.body;
    if (!sessionToken) {
      return res.status(401).json({ success: false, message: 'Valid exam session token required.' });
    }

    const session = await examSessionService.getSessionByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Invalid or expired exam session.' });
    }
    if (['SUBMITTED', 'AUTO_SUBMITTED'].includes(session.status)) {
      return res.status(403).json({ success: false, message: 'Exam has already been submitted.' });
    }

    const data = await searchService.searchWeb(query, session, questionId, req.ip);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function readWebPage(req, res) {
  try {
    const { sessionToken, url } = req.body;
    if (!sessionToken) {
      return res.status(401).json({ success: false, message: 'Valid exam session token required.' });
    }

    const session = await examSessionService.getSessionByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Invalid or expired exam session.' });
    }

    const data = await searchService.readWebPage(url, session);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function askAi(req, res) {
  try {
    const { sessionToken, prompt, questionContext, codeContext, questionId } = req.body;
    if (!sessionToken) {
      return res.status(401).json({ success: false, message: 'Valid exam session token required.' });
    }

    const session = await examSessionService.getSessionByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Invalid or expired exam session.' });
    }
    if (['SUBMITTED', 'AUTO_SUBMITTED'].includes(session.status)) {
      return res.status(403).json({ success: false, message: 'Exam has already been submitted.' });
    }

    const data = await aiService.queryAiAssistant({
      prompt,
      questionContext,
      codeContext,
      session,
      questionId
    });
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function getAiStatus(req, res) {
  try {
    const sessionToken = req.headers['x-exam-session-token'] || req.query.sessionToken;
    if (!sessionToken) {
      return res.status(401).json({ success: false, message: 'Valid exam session token required.' });
    }
    const session = await examSessionService.getSessionByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Invalid or expired exam session.' });
    }
    const data = await aiService.getAiAssistantStatus(session.id);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

module.exports = {
  verifyOtp,
  syncAnswers,
  reportViolation,
  submitExam,
  searchWeb,
  readWebPage,
  askAi,
  getAiStatus
};

