const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const studentController = require('../controllers/studentController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isStudent } = require('../middleware/roleMiddleware');

// Configure multer for student submissions (Issue #26)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/submissions';
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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Apply authentication and student role checks (Issue #24)
router.use(authenticateToken);
router.use(isStudent);

router.get('/my-tasks', studentController.getMyTasks);
router.get('/task/:id', studentController.getTaskDetail);
router.post('/submission/create', upload.single('file'), studentController.submitTask); // Issue #26
router.get('/my-submissions', studentController.getMySubmissions);
router.get('/recent-activity', studentController.getRecentActivity);

// Mock Interviews and Mentoring
router.get('/my-interviews', studentController.getMyInterviews);
router.get('/my-mentoring', studentController.getMyMentoringSessions);

module.exports = router;
