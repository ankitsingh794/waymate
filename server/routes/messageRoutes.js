const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect, isChatMember } = require('../middlewares/authMiddleware'); 
const { messageLimiter } = require('../middlewares/rateLimiter');
const { uploadMedia } = require('../middlewares/multer'); 
const { mongoIdValidation } = require('../utils/validationHelpers');
const validate = require('../middlewares/validateMiddleware');

// Define middleware chain for session-based routes for clarity
const sessionAccess = [protect, mongoIdValidation('sessionId'), validate, isChatMember];

// Get paginated message history for a chat session
router.get('/session/:sessionId', sessionAccess, messageController.getMessages);

// Send a media message (image, video, file)
router.post(
    '/session/:sessionId/media',
    sessionAccess,
    messageLimiter,
    uploadMedia('media'), 
    messageController.sendMediaMessage
);

router.post(
  "/test-upload",
  uploadMedia("media"),
  (req, res) => {
    console.log("req.file:", req.file);
    console.log("req.body:", req.body);
    if (!req.file) {
      return res.status(400).json({ error: "No file received" });
    }
    res.json({ file: req.file });
  }
);


module.exports = router;