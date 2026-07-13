// Student Execution & Mentorship Platform - Core API Routes
// Comprehensive API endpoints for all platform modules

const express = require('express');
const router = express.Router();
const platformController = require('../controllers/platformController');
const { authenticateToken } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// =============================================
// USER MANAGEMENT
// =============================================

// Get all users (admin only)
router.get('/users', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin']), 
  platformController.getAllUsers
);

// Get user by ID
router.get('/users/:id', 
  authenticateToken, 
  platformController.getUserById
);

// Update user profile
router.put('/users/:id', 
  authenticateToken, 
  platformController.updateUser
);

// Get users by role
router.get('/users/role/:role', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator']), 
  platformController.getUsersByRole
);

// =============================================
// BATCH MANAGEMENT
// =============================================

// Get all batches
router.get('/batches', 
  authenticateToken, 
  platformController.getBatches
);

// Get batch by ID
router.get('/batches/:id', 
  authenticateToken, 
  platformController.getBatchById
);

// Create new batch (admin/coordinator)
router.post('/batches', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator']), 
  platformController.createBatch
);

// Update batch
router.put('/batches/:id', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator']), 
  platformController.updateBatch
);

// Get batch students
router.get('/batches/:id/students', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator']), 
  platformController.getBatchStudents
);

// Assign students to batch
router.post('/batches/:id/students', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator']), 
  platformController.assignStudentsToBatch
);

// =============================================
// PROJECT & TASK MANAGEMENT
// =============================================

// Get all projects
router.get('/projects', 
  authenticateToken, 
  platformController.getProjects
);

// Get project by ID
router.get('/projects/:id', 
  authenticateToken, 
  platformController.getProjectById
);

// Create new project (admin/coordinator)
router.post('/projects', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator']), 
  platformController.createProject
);

// Update project
router.put('/projects/:id', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator']), 
  platformController.updateProject
);

// Get project steps
router.get('/projects/:id/steps', 
  authenticateToken, 
  platformController.getProjectSteps
);

// Assign project to student
router.post('/students/:studentId/projects', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator']), 
  platformController.assignProjectToStudent
);

// Get student projects
router.get('/students/:studentId/projects', 
  authenticateToken, 
  platformController.getStudentProjects
);

// Update student project progress
router.put('/student-projects/:id', 
  authenticateToken, 
  platformController.updateStudentProject
);

// Update step progress
router.put('/step-progress/:id', 
  authenticateToken, 
  platformController.updateStepProgress
);

// =============================================
// LIVE CLASSROOM SYSTEM
// =============================================

// Get all sessions
router.get('/sessions', 
  authenticateToken, 
  platformController.getSessions
);

// Get session by ID
router.get('/sessions/:id', 
  authenticateToken, 
  platformController.getSessionById
);

// Create new session
router.post('/sessions', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator', 'faculty']), 
  platformController.createSession
);

// Update session
router.put('/sessions/:id', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator', 'faculty']), 
  platformController.updateSession
);

// Start session (make it live)
router.post('/sessions/:id/start', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator', 'faculty']), 
  platformController.startSession
);

// End session
router.post('/sessions/:id/end', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator', 'faculty']), 
  platformController.endSession
);

// Join session
router.post('/sessions/:id/join', 
  authenticateToken, 
  platformController.joinSession
);

// Leave session
router.post('/sessions/:id/leave', 
  authenticateToken, 
  platformController.leaveSession
);

// Get session participants
router.get('/sessions/:id/participants', 
  authenticateToken, 
  platformController.getSessionParticipants
);

// =============================================
// MOCK INTERVIEW SYSTEM
// =============================================

// Get interview sessions
router.get('/interviews', 
  authenticateToken, 
  platformController.getInterviewSessions
);

// Schedule interview
router.post('/interviews', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator', 'faculty']), 
  platformController.scheduleInterview
);

// Submit interview evaluation
router.post('/interviews/:sessionId/evaluation', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'faculty']), 
  platformController.submitInterviewEvaluation
);

// Get all interview evaluations (faculty/admin)
router.get('/interviews/evaluations', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'faculty']), 
  platformController.getInterviewEvaluations
);

// Get interview evaluations for a session
router.get('/interviews/:sessionId/evaluations', 
  authenticateToken, 
  platformController.getInterviewEvaluations
);

// Get student interview history
router.get('/students/:studentId/interviews', 
  authenticateToken, 
  platformController.getStudentInterviewHistory
);

// =============================================
// PERFORMANCE INTELLIGENCE
// =============================================

// Get student performance metrics
router.get('/students/:studentId/performance', 
  authenticateToken, 
  platformController.getStudentPerformance
);

// Get batch performance overview
router.get('/batches/:id/performance', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator']), 
  platformController.getBatchPerformance
);

// Get performance analytics
router.get('/analytics/performance', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator']), 
  platformController.getPerformanceAnalytics
);

// Get risk analysis
router.get('/analytics/risk', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator']), 
  platformController.getRiskAnalysis
);

// Get leaderboard
router.get('/analytics/leaderboard', 
  authenticateToken, 
  platformController.getLeaderboard
);

// Calculate daily performance metrics
router.post('/performance/calculate', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin']), 
  platformController.calculatePerformanceMetrics
);

// =============================================
// NOTIFICATION SYSTEM
// =============================================

// Get user notifications
router.get('/notifications', 
  authenticateToken, 
  platformController.getNotifications
);

// Mark notification as read
router.put('/notifications/:id/read', 
  authenticateToken, 
  platformController.markNotificationRead
);

// Mark all as read
router.put('/notifications/read-all', 
  authenticateToken, 
  platformController.markAllNotificationsRead
);

// Delete notification
router.delete('/notifications/:id', 
  authenticateToken, 
  platformController.deleteNotification
);

// Create notification
router.post('/notifications', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator', 'faculty']), 
  platformController.createNotification
);

// Send bulk notifications
router.post('/notifications/bulk', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator']), 
  platformController.sendBulkNotifications
);

// =============================================
// ATTENDANCE SYSTEM
// =============================================

// Get attendance records
router.get('/attendance', 
  authenticateToken, 
  platformController.getAttendanceRecords
);

// Get session attendance
router.get('/sessions/:id/attendance', 
  authenticateToken, 
  platformController.getSessionAttendance
);

// Take manual attendance
router.post('/sessions/:id/attendance/manual', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator', 'faculty']), 
  platformController.takeManualAttendance
);

// Get attendance analytics
router.get('/analytics/attendance', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator']), 
  platformController.getAttendanceAnalytics
);

// =============================================
// ADMIN ANALYTICS
// =============================================

// Get system overview
router.get('/admin/overview', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin']), 
  platformController.getSystemOverview
);

// Get user activity logs
router.get('/admin/activity-logs', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin']), 
  platformController.getActivityLogs
);

// Get batch comparisons
router.get('/admin/batch-comparisons', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin']), 
  platformController.getBatchComparisons
);

// Get faculty performance
router.get('/admin/faculty-performance', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin']), 
  platformController.getFacultyPerformance
);

// =============================================
// SYSTEM CONFIGURATION
// =============================================

// Get system settings
router.get('/settings', 
  authenticateToken, 
  platformController.getSystemSettings
);

// Update system settings
router.put('/settings/:key', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin']), 
  platformController.updateSystemSetting
);

// Get public settings
router.get('/settings/public', 
  platformController.getPublicSettings
);

// =============================================
// REAL-TIME ENDPOINTS (for WebSocket integration)
// =============================================

// Get active sessions
router.get('/realtime/active-sessions', 
  authenticateToken, 
  platformController.getActiveSessions
);

// Get online users
router.get('/realtime/online-users', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator']), 
  platformController.getOnlineUsers
);

// Get batch activity
router.get('/realtime/batch-activity/:batchId', 
  authenticateToken, 
  roleMiddleware.requireRole(['admin', 'coordinator']), 
  platformController.getBatchActivity
);

module.exports = router;
