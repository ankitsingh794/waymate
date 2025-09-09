const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { requireConsent } = require('../middlewares/consentMiddleware');
const trackingController = require('../controllers/trackingController');

router.use(protect, requireConsent('passive_tracking'));

router.post('/start', trackingController.startTrip);
router.post('/confirm-start', trackingController.confirmTripStart);
router.post('/cancel-start', trackingController.cancelTripStart);
router.post('/change-mode', trackingController.changeTripMode);
router.post('/append', trackingController.appendDataToTrip);
router.post('/end', trackingController.endTrip);
router.post('/trips/:tripId/confirm', trackingController.confirmOrCorrectTripMode); 

module.exports = router;

