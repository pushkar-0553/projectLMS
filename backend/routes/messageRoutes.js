const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/send', messageController.sendMessage);
router.get('/inbox', messageController.getInbox);
router.get('/unread-count', messageController.getUnreadCount);
router.put('/mark-read/:senderId', messageController.markAsRead);
router.get('/batch/:batchId', messageController.getBatchAnnouncements);
router.get('/conversation/:userId', messageController.getConversation);

// Pinning
router.post('/:id/pin', messageController.pinMessage);
router.post('/:id/unpin', messageController.unpinMessage);
router.get('/pinned', messageController.getPinnedMessages);
router.post('/:id/react', messageController.toggleReaction);

module.exports = router;
