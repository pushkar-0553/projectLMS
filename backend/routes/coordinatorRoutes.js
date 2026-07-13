const express = require('express');
const router = express.Router();
const coordinatorController = require('../controllers/coordinatorController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isCoordinator } = require('../middleware/roleMiddleware');

// Apply authentication and coordinator role check to all routes
router.use(authenticateToken);
router.use(isCoordinator);

// Sub-batch management
router.post('/create-subbatch', coordinatorController.createSubBatch);
router.get('/my-subbatches', coordinatorController.getMySubBatches);
router.put('/subbatch/:subBatchId/class-link', coordinatorController.updateSubBatchClassLink);
router.post('/assign-student', coordinatorController.assignStudentToSubBatch);

// Task management
router.post('/task/create', coordinatorController.createTask);
router.post('/task/assign', coordinatorController.assignTask);
router.get('/my-tasks', coordinatorController.getMyTasks);
router.get('/task/:taskId/submissions', coordinatorController.getTaskSubmissions);

// Submission review
router.post('/submission/review', coordinatorController.reviewSubmission);

// Dashboard & Approvals
router.get('/dashboard-stats', coordinatorController.getDashboardStats);
router.get('/pending-approvals', coordinatorController.getPendingApprovals);
router.get('/project-stats', coordinatorController.getProjectStats);
router.get('/student/:studentId/progress', coordinatorController.getStudentProgress);
router.post('/approve-step/:progressId', coordinatorController.approveStep);
router.post('/reject-step/:progressId', coordinatorController.rejectStep);

router.get('/history', coordinatorController.getMyHistory);

module.exports = router;
