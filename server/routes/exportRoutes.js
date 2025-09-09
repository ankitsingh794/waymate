const express = require('express');
const router = express.Router();
const { protect, authorizeRoles} = require('../middlewares/authMiddleware');
const exportController = require('../controllers/exportController');
const rateLimiter = require('../middlewares/rateLimiter')

// All routes in this file require the user to be an authenticated researcher
router.use(protect, authorizeRoles('researcher'));

/**
 * @route   GET /api/v1/export/trips/json
 * @desc    Export anonymized trip data as JSON
 * @access  Researcher only
 */
router.get('/trips/json', rateLimiter.strictLimiter, exportController.exportTripsAsJson);

/**
 * @route   GET /api/v1/export/trips/csv
 * @desc    Export anonymized trip data as CSV
 * @access  Researcher only
 */
router.get('/trips/csv', rateLimiter.strictLimiter, exportController.exportTripsAsCsv);


/**
 * @route   GET /api/v1/export/trips/natpac-csv
 * @desc    Export anonymized trip data in the standardized NATPAC CSV format
 * @access  Researcher only
 */
router.get('/trips/natpac-csv',rateLimiter.strictLimiter, exportController.exportTripsAsNatpacCsv);


module.exports = router;
