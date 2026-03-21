const express = require('express');
const router = express.Router();
const progressController = require('../controllers/simpleProgressController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(authenticateToken);

// Submit step for approval (Main projects)
router.post('/submit-step', progressController.submitStep);

// Complete step directly (Simple projects - no approval)
router.post('/complete-simple', progressController.completeSimpleStep);

// Get user's learning progress
router.get('/user', progressController.getUserProgress);

// Get current step for a project
router.get('/current/:projectId', progressController.getCurrentStep);

// Get student learning statistics
router.get('/stats', progressController.getStudentStats);

// Get next available step
router.get('/next/:projectId', progressController.getNextStep);

module.exports = router;
