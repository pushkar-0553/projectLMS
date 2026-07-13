const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendanceController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const isCoordinatorOrAdmin = requireRole(['coordinator', 'admin']);
const isStudent = requireRole(['student']);

router.use(authenticateToken);

// Batch management
router.get('/batches', isCoordinatorOrAdmin, ctrl.getBatches);
router.get('/unassigned', isCoordinatorOrAdmin, ctrl.getUnassigned);
router.post('/assign', isCoordinatorOrAdmin, ctrl.assignStudent);
router.delete('/assign/:studentId/:batchId', isCoordinatorOrAdmin, ctrl.removeStudent);

// Session & daily attendance
router.get('/today/:batchId', isCoordinatorOrAdmin, ctrl.getToday);
router.post('/session/:batchId', isCoordinatorOrAdmin, ctrl.upsertSession);
router.post('/mark', isCoordinatorOrAdmin, ctrl.markAttendance);

// History
router.get('/history/:batchId', isCoordinatorOrAdmin, ctrl.getHistory);
router.get('/session/:sessionId', isCoordinatorOrAdmin, ctrl.getSessionDetail);

// Student's own view
router.get('/my-summary', isStudent, ctrl.getMyAttendanceSummary);

module.exports = router;
