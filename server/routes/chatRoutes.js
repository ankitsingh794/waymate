const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { body } = require('express-validator');
const { protect, isChatMember } = require('../middlewares/authMiddleware');
const { messageLimiter, generalLimiter } = require('../middlewares/rateLimiter');
const { mongoIdValidation } = require('../utils/validationHelpers');
const validate = require('../middlewares/validateMiddleware');

// All routes in this file are protected and require authentication
router.use(protect);

// --- AI Session Management ---

// Finds an existing AI chat session for the user or creates a new one.
router.post('/sessions/ai', generalLimiter, chatController.findOrCreateAiSession);

// Clears all messages from the user's private AI chat session.
router.post('/sessions/ai/clear', generalLimiter, chatController.clearAiChatHistory);

// --- Group Session Management ---

// NEW: Gets all group chat sessions for the authenticated user.
router.get('/sessions/group', generalLimiter, chatController.getGroupSessions);


// --- AI Message Handling ---

// The primary endpoint for sending a message to the AI assistant.
// It handles complex conversational flows, intent detection, and trip creation logic.
router.post(
    '/message/ai/:sessionId',
    messageLimiter,
    [
        mongoIdValidation('sessionId'),
        body('message').notEmpty().withMessage('Message text cannot be empty.').trim()
    ],
    validate,
    isChatMember, // Ensures the user is a participant of this AI session
    chatController.handleChatMessage
);

module.exports = router;

