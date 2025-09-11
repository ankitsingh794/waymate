const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const notificationController = require('../controllers/notificationController');

// All notification routes require a user to be logged in
router.use(protect);

router.route('/')
    .get(notificationController.getNotifications);

router.route('/mark-all-read')
    .post(notificationController.markAllAsRead);

module.exports = router;