const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academicController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isAdminOrCoordinator, isStudent } = require('../middleware/roleMiddleware');

router.use(authenticateToken);

router.get('/me', isStudent, academicController.getMyAcademics);
router.get('/overview', isAdminOrCoordinator, academicController.getOverview);

router.post('/class-links', isAdminOrCoordinator, academicController.createClassLink);
router.get('/class-links', isAdminOrCoordinator, academicController.getClassLinks);
router.put('/class-links/:linkId', isAdminOrCoordinator, academicController.updateClassLink);
router.delete('/class-links/:linkId', isAdminOrCoordinator, academicController.deleteClassLink);

router.post('/attendance/sessions', isAdminOrCoordinator, academicController.createAttendanceSession);
router.get('/attendance/sessions', isAdminOrCoordinator, academicController.getAttendanceSessions);
router.get('/attendance/sessions/:sessionId/records', isAdminOrCoordinator, academicController.getAttendanceRecords);
router.post('/attendance/sessions/:sessionId/records', isAdminOrCoordinator, academicController.markAttendance);

router.post('/assessments', isAdminOrCoordinator, academicController.createAssessment);
router.get('/assessments', isAdminOrCoordinator, academicController.getAssessments);
router.post('/assessments/:assessmentId/results', isAdminOrCoordinator, academicController.recordAssessmentResults);

// Proxy route for meeting URLs (to bypass iframe restrictions)
router.get('/proxy-meet', (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }
  
  // Basic URL validation
  try {
    const validUrl = new URL(url);
    if (!['http:', 'https:'].includes(validUrl.protocol)) {
      return res.status(400).json({ message: 'Invalid URL protocol' });
    }
    
    // Return HTML page with the meeting URL
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Meeting - ${validUrl.hostname}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          .header { background: #1a73e8; color: white; padding: 1rem; text-align: center; }
          .content { height: calc(100vh - 60px); }
          .content iframe { width: 100%; height: 100%; border: none; }
          .warning { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 1rem; margin: 1rem; }
          .btn { background: #1a73e8; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; text-decoration: none; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Meeting Portal - ${validUrl.hostname}</h2>
        </div>
        <div class="content">
          <div class="warning">
            <p><strong>Security Notice:</strong> This is a proxy page for the meeting. For best experience, click the button below to open directly.</p>
            <a href="${url}" target="_blank" class="btn">Open Meeting in New Tab</a>
          </div>
          <iframe src="${url}" allow="camera; microphone; fullscreen; display-capture"></iframe>
        </div>
        <script>
          // Handle iframe load errors
          document.querySelector('iframe').addEventListener('error', function() {
            document.querySelector('.warning').style.display = 'block';
            document.querySelector('iframe').style.display = 'none';
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(400).json({ message: 'Invalid URL format' });
  }
});

module.exports = router;
