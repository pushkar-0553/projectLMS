const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const projectController = require('../controllers/projectController');
const progressController = require('../controllers/progressController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/projects';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, documents, and archives are allowed.'));
    }
  }
});

// Progress and learning flow routes
router.get('/roadmap', authenticateToken, progressController.getRoadmap);
router.get('/resume', authenticateToken, progressController.resumeLearning);
router.get('/progress/user', authenticateToken, progressController.getUserProgress);
router.get('/progress/:projectId', authenticateToken, progressController.getProjectProgress);
router.post('/progress/step', authenticateToken, progressController.completeStep);
router.get('/progress/check/:projectId/:stepId', authenticateToken, progressController.checkStepAccess);

// Dashboard stats
router.get('/dashboard/stats', authenticateToken, projectController.getDashboardStats);

// Project routes - public
router.get('/', projectController.getAllProjects);
router.get('/type/:type', projectController.getProjectsByType);
router.get('/level/:level', projectController.getProjectsByLevel);
router.get('/:id', projectController.getProjectById);
router.get('/:projectId/steps', authenticateToken, projectController.getStepsByProjectId);

// Admin-only routes
router.post('/', authenticateToken, isAdmin, upload.any(), projectController.createProject);
router.put('/:id', authenticateToken, isAdmin, upload.any(), projectController.updateProject);
router.delete('/:id', authenticateToken, isAdmin, projectController.deleteProject);
router.post('/:projectId/steps', authenticateToken, isAdmin, upload.any(), projectController.createStep);
router.put('/steps/:stepId', authenticateToken, isAdmin, upload.any(), projectController.updateStep);
router.delete('/steps/:stepId', authenticateToken, isAdmin, projectController.deleteStep);

module.exports = router;
