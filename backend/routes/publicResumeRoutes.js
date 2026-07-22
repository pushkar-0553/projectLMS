const express = require('express');
const router = express.Router();
const multer = require('multer');
const resumeCollectionController = require('../controllers/resumeCollectionController');
const resumeController = require('../controllers/resumeController');
const storageController = require('../controllers/storageController');

// Configure multer memory storage for spreadsheets (max 15MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

const handleSpreadsheetUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds the 15MB limit' });
      }
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// Public route to retrieve collection by token (Bypasses authentication)
router.get('/public/resumes/:token', resumeCollectionController.getPublicCollectionByToken);

// Public route to submit recruiter review evaluations
router.post('/public/resumes/:token/review', resumeCollectionController.submitPublicReview);

// Public route to download single and bulk resumes
router.get('/public/resumes/:token/download/:studentId', resumeController.downloadSingleResumePublic);
router.get('/public/resumes/:token/download-bulk', resumeController.downloadBulkResumesPublic);

// Google Drive integration routes
router.post('/resume/share/google-drive/upload', handleSpreadsheetUpload, storageController.uploadToStorage);
router.post('/resume/share/google-drive/convert', storageController.convertToSpreadsheet);

module.exports = router;
