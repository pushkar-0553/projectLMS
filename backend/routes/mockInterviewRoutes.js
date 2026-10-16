const express = require('express');
const router = express.Router();
const mockInterviewController = require('../controllers/mockInterviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Strictly internal routes for Admin and Coordinator
router.use(protect);
router.use(authorize('admin', 'coordinator'));

// Mock Interview Drives & Events
router.post('/mock-interviews', mockInterviewController.createMockInterview);
router.get('/mock-interviews', mockInterviewController.getAllMockInterviews);
router.get('/mock-interviews/:id', mockInterviewController.getMockInterviewDetail);
router.put('/mock-interviews/:id', mockInterviewController.updateMockInterview);
router.patch('/mock-interviews/:id/meet-link', mockInterviewController.updateMeetLink);
router.patch('/mock-interviews/:id/whatsapp-template', mockInterviewController.updateWhatsAppTemplate);
router.delete('/mock-interviews/:id', mockInterviewController.deleteMockInterview);

// Participants Management & Slot Allocation
router.get('/mock-interviews/:id/students', mockInterviewController.getStudents);
router.post('/mock-interviews/:id/participants/:studentId/status', mockInterviewController.updateParticipantStatus);
router.post('/mock-interviews/:id/generate-slots', mockInterviewController.generateSlots);

// Interview Execution & Timing Tracking
router.post('/mock-interviews/:id/participants/:studentId/start', mockInterviewController.startInterview);
router.post('/mock-interviews/:id/participants/:studentId/complete', mockInterviewController.completeInterview);

module.exports = router;
