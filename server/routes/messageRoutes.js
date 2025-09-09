const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect, isChatMember } = require('../middlewares/authMiddleware'); 
const { messageLimiter } = require('../middlewares/rateLimiter');
const { uploadMedia } = require('../middlewares/multer'); 
const { mongoIdValidation } = require('../utils/validationHelpers');
const { body } = require('express-validator');
const validate = require('../middlewares/validateMiddleware');

// All routes in this file are protected and require authentication
router.use(protect);

// Middleware chain to validate session ID and membership for all session-based routes
const sessionAccess = [mongoIdValidation('sessionId'), validate, isChatMember];

// --- Message History ---

// Get paginated message history for any chat session (AI or group).
router.get('/session/:sessionId', sessionAccess, messageController.getMessages);

// --- Message Sending ---

// Send a text message to a chat session.
router.post(
    '/session/:sessionId/text',
    sessionAccess,
    messageLimiter,
    [ body('message').notEmpty().withMessage('Message text cannot be empty.').trim() ],
    validate,
    messageController.sendTextMessage
);

// Send a media message (image, video, file) to a chat session.
router.post(
    '/session/:sessionId/media',
    sessionAccess,
    messageLimiter,
    uploadMedia('media'), // Multer middleware for file handling
    messageController.sendMediaMessage
);

module.exports = router;
