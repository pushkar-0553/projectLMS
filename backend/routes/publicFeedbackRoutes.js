const express = require('express');
const router = express.Router();
const publicFeedbackController = require('../controllers/publicFeedbackController');

// Public route to retrieve feedback questionnaire by token (No authentication required)
router.get('/public/feedback/:token', publicFeedbackController.getByToken);

// Public route for high-concurrency queued feedback submission
router.post('/public/feedback/:token/submit', publicFeedbackController.submitByToken);

// Public route for students to request re-edit permission
router.post('/public/feedback/:token/request-edit', publicFeedbackController.requestEditAccess);

module.exports = router;
