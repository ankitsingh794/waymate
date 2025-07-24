const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { handleChatMessage, findOrCreateAiSession } = require('../controllers/chatController');

const router = express.Router();

// All chat routes are protected and require an authenticated user.
router.use(protect);

/**
 * @desc    Main endpoint for handling all conversational messages.
 * @route   POST /api/chat/message
 */
router.post('/message', handleChatMessage);

router.post('/sessions/ai', findOrCreateAiSession);

module.exports = router;
