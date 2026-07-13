const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', notificationController.getMyNotifications);
router.put('/:id/read', notificationController.markRead);
router.put('/read-all', notificationController.markAllRead);
router.delete('/:id', notificationController.deleteNotification);

// Issue #12 fix: Only admin, coordinator, and faculty can create/send notifications
router.post('/', authorize('admin', 'coordinator', 'faculty'), notificationController.createNotification);
router.post('/send', authorize('admin', 'coordinator', 'faculty'), notificationController.sendManualNotification);

module.exports = router;
