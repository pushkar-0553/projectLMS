const emailQueueWorker = require('../../services/emailQueueWorker');

async function getEmailQueueStatus(req, res) {
  try {
    const { status, assignmentId, limit, offset } = req.query;
    const result = await emailQueueWorker.getEmailQueueStatus({ status, assignmentId, limit, offset });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function queueExamEmails(req, res) {
  try {
    const { assignmentId } = req.params;
    const frontendBaseUrl = (req.body.baseUrl || req.headers.origin || process.env.FRONTEND_URL || 'https://project-lms-six.vercel.app').replace(/\/$/, '');
    const apiBaseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await emailQueueWorker.queueExamEmails(assignmentId, frontendBaseUrl, apiBaseUrl, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function retryFailedJobs(req, res) {
  try {
    const { jobIds } = req.body;
    const result = await emailQueueWorker.retryFailedJobs(jobIds || []);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function queueCandidateEmail(req, res) {
  try {
    const { candidateId } = req.params;
    const frontendBaseUrl = (req.body.baseUrl || req.headers.origin || process.env.FRONTEND_URL || 'https://project-lms-six.vercel.app').replace(/\/$/, '');
    const apiBaseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await emailQueueWorker.queueCandidateEmail(candidateId, frontendBaseUrl, apiBaseUrl, req.user?.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function trackEmailOpen(req, res) {
  try {
    const { jobId } = req.params;
    await emailQueueWorker.trackEmailOpen(jobId);
  } catch (err) {
    // Non-blocking for tracking pixel
  }
  // Return transparent 1x1 GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache'
  });
  res.end(pixel);
}

module.exports = {
  getEmailQueueStatus,
  queueExamEmails,
  queueCandidateEmail,
  trackEmailOpen,
  retryFailedJobs
};
