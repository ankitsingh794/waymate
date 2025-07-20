
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../middlewares/authMiddleware');
const { isGroupMember } = require('../middlewares/groupAuthMiddleware');
const { messageLimiter } = require('../middlewares/rateLimiter');
const upload = require('../middlewares/multer'); // Your multer config from multer.js

// Get paginated message history for a chat session
// isGroupMember ensures only participants can fetch messages
router.get('/session/:sessionId', protect, isGroupMember, messageController.getMessages);

// Send a media message (image, video, file)
// isGroupMember ensures only participants can upload media
router.post('/session/:sessionId/media', protect, isGroupMember, messageLimiter, upload.single('media'), messageController.sendMediaMessage);

module.exports = router;
