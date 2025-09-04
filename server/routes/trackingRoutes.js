const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { requireConsent } = require('../middlewares/consentMiddleware'); 
const trackingController = require('../controllers/trackingController');

router.use(protect);

/**
 * @route   POST /api/v1/tracking/data
 * @desc    Accepts a batch of tracking data from a client device
 * @access  Private, Consent Required
 */
router.post('/data', requireConsent('passive_tracking'), trackingController.processDataBatch);

module.exports = router;