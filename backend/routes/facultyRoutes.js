const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes protected for faculty
router.use(protect);
router.use(authorize('faculty', 'admin', 'coordinator'));

// Dashboard & Batches
router.get('/dashboard-stats', facultyController.getDashboardStats);
router.get('/engagement-stats', facultyController.getAttendanceStats);
router.get('/performance', facultyController.getMyPerformance);
router.get('/my-batches', facultyController.getMyBatches);
router.get('/student-performance', facultyController.getStudentPerformanceData);
router.get('/my-notes', facultyController.getMyNotes);
router.post('/notes', facultyController.addNote);
router.delete('/notes/:id', facultyController.deleteNote);

// Mock Interviews
router.get('/interviews', facultyController.getInterviews);
router.post('/interviews', facultyController.scheduleInterview);
router.put('/interviews/:id/status', facultyController.updateInterviewStatus);
router.post('/interviews/evaluate', facultyController.submitEvaluation);

// Mentoring Sessions
router.get('/mentoring', facultyController.getMentoringSessions);
router.post('/mentoring', facultyController.createMentoringSession);

// Student Monitoring
router.get('/student-monitoring', facultyController.getStudentMonitoringData);

// Collaborative route (also usable by students in later steps)
router.get('/batch/:batchId/notes', facultyController.getBatchNotes);

module.exports = router;
