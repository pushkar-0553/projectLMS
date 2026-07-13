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

// Admin-only routes for faculty management
router.post('/faculties', requireRole(['admin']), userController.createFaculty);
router.get('/faculties', requireRole(['admin']), userController.getAllFaculties);

const coordinatorOrFacultyOrAdmin = requireRole(['coordinator', 'faculty', 'admin']);

// Student profile — coordinator, admin, and the student themselves can view
router.get('/students/:id/profile', requireRole(['coordinator', 'faculty', 'admin', 'student']), userController.getStudentProfile);

// Batch assignment — coordinator and admin
router.get('/batches', coordinatorOrFacultyOrAdmin, userController.getAllBatchesForAssignment);
router.put('/students/:id/batch', coordinatorOrFacultyOrAdmin, userController.assignStudentBatch);
router.delete('/students/:id/batch', coordinatorOrFacultyOrAdmin, userController.removeStudentBatch);

// Faculty batch management
router.get('/faculties/:id/batches', coordinatorOrFacultyOrAdmin, userController.getFacultyBatches);
router.post('/faculties/:id/batch', coordinatorOrFacultyOrAdmin, userController.assignFacultyToBatch);
router.delete('/faculties/:id/batch/:batchId', coordinatorOrFacultyOrAdmin, userController.removeFacultyFromBatch);

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
