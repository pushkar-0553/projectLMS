const express = require('express');
const router = express.Router();
const multer = require('multer');
const resumeController = require('../controllers/resumeController');
const resumeCollectionController = require('../controllers/resumeCollectionController');
const { verifyToken } = require('../utils/token');
const User = require('../models/userModel');

// Optional authentication middleware to populate req.user if valid token is sent
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token && req.query.token) token = req.query.token;
  if (!token) return next();

  try {
    const decoded = verifyToken(token);
    const dbUser = await User.findById(decoded.id);
    if (dbUser) {
      req.user = {
        id: dbUser.id,
        role: dbUser.role,
        name: dbUser.name,
        email: dbUser.email
      };
    }
  } catch (err) {
    // If token is invalid or expired, continue without req.user
  }
  next();
};

// Multer memory storage configuration for PDFs (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const mimetype = (file.mimetype || '').toLowerCase();
    const originalName = (file.originalname || '').toLowerCase();

    if (mimetype.includes('pdf') || mimetype === 'application/octet-stream' || originalName.endsWith('.pdf')) {
      return cb(null, true);
    }
    return cb(new Error('Only PDF format is accepted'), false);
  }
});

// Custom middleware wrapper to handle Multer errors gracefully
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds the 10MB limit' });
      }
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

/* =========================================================================
   Resume Dashboard & Student Upload Routes (/api/resumes)
   ========================================================================= */

// Student uploads a resume
router.post('/resumes/upload', optionalAuth, handleUpload, resumeController.uploadResume);

// Delete a resume
router.delete('/resumes/:id', optionalAuth, resumeController.deleteResume);

// Replace a resume
router.put('/resumes/:id', optionalAuth, handleUpload, resumeController.replaceResume);

// Download routes (pre-renamed and bundled ZIP files)
router.get('/resumes/download-bulk', resumeController.downloadBulkResumes);
router.get('/resumes/download/:id', resumeController.downloadSingleResume);

// Get latest resume for a student
router.get('/resumes/student/:id', resumeController.getLatestResume);

// Get upload history for a student
router.get('/resumes/history/:studentId', resumeController.getHistory);

// Get batch resume summaries for rectangle cards
router.get('/resumes/batch-summaries', resumeController.getBatchSummaries);

// Get all students with resumes status
router.get('/resumes', resumeController.getAllResumes);

// Search student resumes
router.get('/resumes/search', resumeController.searchResumes);

// Filter student resumes
router.get('/resumes/filter', resumeController.filterResumes);

// Update student placement info
router.put('/resumes/placement/:studentId', resumeController.updatePlacementInfo);

// Notes routes
router.post('/resumes/notes', resumeController.addNote);
router.get('/resumes/notes/:studentId', resumeController.getNotes);
router.delete('/resumes/notes/:id', resumeController.deleteNote);

/* =========================================================================
   Resume Collections Management Routes (/api/resume-collections)
   ========================================================================= */

// Create collection
router.post('/resume-collections', resumeCollectionController.createCollection);

// Get all collections
router.get('/resume-collections', resumeCollectionController.getAllCollections);

// Get collection detail by ID
router.get('/resume-collections/:id', resumeCollectionController.getCollectionDetail);

// Update collection metadata
router.put('/resume-collections/:id', resumeCollectionController.updateCollection);

// Add students to existing collection link
router.post('/resume-collections/:id/students', resumeCollectionController.addStudentsToCollection);

// Remove student from existing collection link
router.delete('/resume-collections/:id/students/:studentId', resumeCollectionController.removeStudentFromCollection);

// Delete collection
router.delete('/resume-collections/:id', resumeCollectionController.deleteCollection);

module.exports = router;
