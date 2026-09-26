const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All Super Admin routes require platform super_admin role
router.use(protect, authorize('super_admin'));

router.get('/overview', superAdminController.getPlatformOverview);
router.get('/users', superAdminController.getAllUsers);
router.get('/audit-logs', superAdminController.getAuditLogs);

// Course Admin Management
router.post('/assign-course-admin', superAdminController.createOrAssignCourseAdmin);
router.get('/courses/:courseId/admins', superAdminController.getCourseAdmins);
router.delete('/courses/:courseId/admins/:userId', superAdminController.removeCourseAdmin);

module.exports = router;
