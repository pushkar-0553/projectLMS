const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Strictly internal routes for Admin, Coordinator, and Super Admin (scoped to /feedback)
router.use('/feedback', protect, authorize('admin', 'coordinator', 'super_admin'));

// Feedback Campaigns
router.post('/feedback', feedbackController.createFeedback);
router.get('/feedback', feedbackController.getAllFeedbacks);
router.get('/feedback/:id', feedbackController.getFeedbackDetail);
router.put('/feedback/:id', feedbackController.updateFeedback);
router.delete('/feedback/:id', feedbackController.deleteFeedback);

// Student Roster & Feedback Responses
router.get('/feedback/:id/students', feedbackController.getStudents);
router.get('/feedback/:id/responses/:studentId', feedbackController.getStudentResponse);
router.post('/feedback/:id/responses', feedbackController.submitResponse);
router.put('/feedback/:id/responses/:studentId', feedbackController.updateStudentResponse);

// Student Link Permission Controls (Allow/Reject Re-edit)
router.get('/feedback/:id/edit-requests', feedbackController.getEditRequests);
router.post('/feedback/:id/links/:studentId/allow-edit', feedbackController.allowEditAccess);
router.post('/feedback/:id/links/:studentId/reject-edit', feedbackController.rejectEditAccess);

module.exports = router;
