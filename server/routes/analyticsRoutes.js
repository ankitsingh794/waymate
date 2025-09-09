const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const analyticsController = require('../controllers/analyticsController');

// All routes in this file are protected and for researchers only
router.use(protect, authorizeRoles('researcher'));

/**
 * @route   GET /api/v1/analytics/trip-stats
 * @desc    Get high-level aggregate statistics about all trips
 * @access  Researcher only
 */
router.get('/trip-stats', analyticsController.getTripStats);

/**
 * @route   GET /api/v1/analytics/mode-distribution
 * @desc    Get the distribution of trips by transport mode
 * @access  Researcher only
 */
router.get('/mode-distribution', analyticsController.getModeDistribution);

/**
 * @route   GET /api/v1/analytics/purpose-distribution
 * @desc    Get the distribution of trips by purpose
 * @access  Researcher only
 */
router.get('/purpose-distribution', analyticsController.getPurposeDistribution);


/**
 * @route   GET /api/v1/analytics/co-traveler-frequency
 * @desc    Calculates how many trips two members have taken together.
 * @access  Researcher only
 */
router.get(
    '/co-traveler-frequency',
    analyticsController.getCoTravelerFrequency
);


module.exports = router;
