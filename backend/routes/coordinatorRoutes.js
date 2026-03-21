const express = require('express');
const router = express.Router();
const coordinatorController = require('../controllers/coordinatorController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isCoordinator } = require('../middleware/roleMiddleware');

// Apply authentication and coordinator role check to all routes
router.use(authenticateToken);
router.use(isCoordinator);

// Get all students with progress overview
router.get('/students', coordinatorController.getStudents);

// Get pending approvals
router.get('/pending-approvals', coordinatorController.getPendingApprovals);

// Get specific student's progress
router.get('/student/:studentId/progress', coordinatorController.getStudentProgress);

// Approve a step submission
router.post('/approve/:progressId', coordinatorController.approveStep);

// Reject a step submission
router.post('/reject/:progressId', coordinatorController.rejectStep);

// Get coordinator dashboard stats
router.get('/dashboard-stats', coordinatorController.getDashboardStats);

// Get project stats for graphs
router.get('/project-stats', coordinatorController.getProjectStats);

module.exports = router;
