const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isAdmin, requireRole } = require('../middleware/roleMiddleware');

// Apply authentication to all routes
router.use(authenticateToken);

// Admin-only routes for coordinator management
router.post('/coordinators', requireRole(['admin']), userController.createCoordinator);
router.get('/coordinators', requireRole(['admin']), userController.getAllCoordinators);
router.delete('/coordinators/:id', requireRole(['admin']), userController.deleteCoordinator);

// Admin-only routes for student management
router.post('/students', requireRole(['admin']), userController.createStudent);
router.post('/students/bulk', requireRole(['admin']), userController.bulkCreateStudents);
router.get('/students', requireRole(['admin']), userController.getAllStudents);
router.delete('/students/:id', requireRole(['admin']), userController.deleteStudent);

// User profile routes (accessible by any authenticated user)
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/change-password', userController.changePassword);

module.exports = router;
