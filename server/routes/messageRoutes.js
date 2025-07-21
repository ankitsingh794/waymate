const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../middlewares/authMiddleware');
const { isGroupMember } = require('../middlewares/isGroupMember'); // Corrected path
const { messageLimiter } = require('../middlewares/rateLimiter');
const upload = require('../middlewares/multer');

// Get paginated message history for a chat session
router.get('/session/:sessionId', protect, isGroupMember, messageController.getMessages);

// Send a media message (image, video, file)
router.post('/session/:sessionId/media', protect, isGroupMember, messageLimiter, upload.single('media'), messageController.sendMediaMessage);

module.exports = router;
