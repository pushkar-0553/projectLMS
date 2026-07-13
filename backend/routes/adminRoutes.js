const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isAdmin, isAdminOrCoordinator } = require('../middleware/roleMiddleware');

// Apply authentication to all routes
router.use(authenticateToken);

// Admin-only creation routes
router.post('/create-user', isAdmin, adminController.createUser);
router.post('/create-batch', isAdmin, adminController.createBatch);
router.put('/batches/:batchId/class-link', isAdminOrCoordinator, adminController.updateBatchClassLink);

// Issue #9 fix: Add bulk create students route
router.post('/bulk-create-students', isAdmin, userController.bulkCreateStudents);

// Issue #8 fix: Add delete user route
router.delete('/users/:id', isAdmin, adminController.deleteUser);

// Shared data access (Admin and Coordinator)
router.get('/batches', isAdminOrCoordinator, adminController.getBatches);
router.get('/coordinators', isAdminOrCoordinator, adminController.getCoordinators);
router.get('/faculties', isAdminOrCoordinator, adminController.getFaculties);
router.get('/students', isAdminOrCoordinator, adminController.getStudents);

// Admin-only history
router.get('/history', isAdmin, adminController.getHistory);

module.exports = router;
