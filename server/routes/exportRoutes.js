const express = require('express');
const comprehensiveExportController = require('../controllers/comprehensiveExportController');
const exportController = require('../controllers/exportController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware'); // FIX: Use authorizeRoles instead of restrictTo

const router = express.Router();

// Protect all export routes
router.use(protect);
router.use(authorizeRoles('researcher', 'admin')); // FIX: Use authorizeRoles instead of restrictTo

/**
 * @route   GET /api/v1/export/trips/json
 * @desc    Export anonymized trip data as JSON
 * @access  Researcher only
 */
router.get('/trips/json', exportController.exportTripsAsJson);

/**
 * @route   GET /api/v1/export/trips/csv
 * @desc    Export anonymized trip data as CSV
 * @access  Researcher only
 */
router.get('/trips/csv', exportController.exportTripsAsCsv);


/**
 * @route   GET /api/v1/export/trips/natpac-csv
 * @desc    Export anonymized trip data in the standardized NATPAC CSV format
 * @access  Researcher only
 */
router.get('/trips/natpac-csv', exportController.exportTripsAsNatpacCsv);

// NEW: Enhanced NATPAC export routes
router.get('/natpac/comprehensive-csv', comprehensiveExportController.exportComprehensiveNatpacCsv);
router.get('/natpac/trip-chains-csv', comprehensiveExportController.exportTripChainsCsv);
router.get('/natpac/mode-share-csv', comprehensiveExportController.exportModeShareCsv);

/**
 * @route   GET /api/v1/export/stats
 * @desc    Get export statistics
 * @access  Researcher only
 */
router.get('/stats', exportController.getExportStats);

module.exports = router;
