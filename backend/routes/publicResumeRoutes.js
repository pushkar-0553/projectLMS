const express = require('express');
const router = express.Router();
const resumeCollectionController = require('../controllers/resumeCollectionController');

// Public route to retrieve collection by token (Bypasses authentication)
router.get('/public/resumes/:token', resumeCollectionController.getPublicCollectionByToken);

module.exports = router;
