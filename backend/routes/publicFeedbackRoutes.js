const express = require('express');
const router = express.Router();
const publicFeedbackController = require('../controllers/publicFeedbackController');

// Public route to retrieve feedback questionnaire by token (No authentication required)
router.get('/public/feedback/:token', publicFeedbackController.getByToken);

// Public route for high-concurrency queued feedback submission
router.post('/public/feedback/:token/submit', publicFeedbackController.submitByToken);

// Public route for students to request re-edit permission
router.post('/public/feedback/:token/request-edit', publicFeedbackController.requestEditAccess);

// Public routes for higher officials to review catalog and export documents (Read-only)
router.get('/public/feedback/catalog/:token', publicFeedbackController.getCatalogByToken);
router.get('/public/feedback/catalog/:token/export/pdf', publicFeedbackController.exportPublicCatalogPDF);
router.get('/public/feedback/catalog/:token/export/docx', publicFeedbackController.exportPublicCatalogDOCX);

module.exports = router;
