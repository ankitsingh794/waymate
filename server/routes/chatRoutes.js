const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { body } = require('express-validator');
const { protect, isChatMember } = require('../middlewares/authMiddleware');
const { messageLimiter, generalLimiter } = require('../middlewares/rateLimiter');
const validate = require('../middlewares/validateMiddleware');

router.use(protect);

// Validation middleware for sending a message
const sendMessageValidation = [
    body('sessionId').isMongoId().withMessage('A valid session ID is required.'),
    body('message').notEmpty().withMessage('Message text cannot be empty.').trim()
];

// This route now correctly points to the main exported function for handling AI interactions.
router.post('/message/ai', messageLimiter, sendMessageValidation, validate, isChatMember, chatController.handleChatMessage);

// THIS ROUTE IS FOR CLEARING AI CHAT HISTORY
router.post('/sessions/ai/clear', generalLimiter, chatController.clearAiChatHistory);

// This route is correct as findOrCreateAiSession is properly exported.
router.post('/sessions/ai', generalLimiter, chatController.findOrCreateAiSession);

// I have left the route as is, assuming you have this function defined elsewhere.
router.post('/message/group', messageLimiter, sendMessageValidation, validate, isChatMember, chatController.handleGroupChatMessage);

module.exports = router;