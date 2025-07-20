const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { tripCreationLimiter } = require('../middlewares/rateLimiter');

const {
  downloadTripPdf,
  getAllTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  getUpcomingTrips,
  updateTripStatus,
  generateAIPlan
} = require('../controllers/tripController');

const router = express.Router();

/**
 * ✅ Validation Rules for Trip Create/Update
 */
const tripValidationRules = [
  body('destination')
    .notEmpty().withMessage('Destination is required'),
  body('startDate')
    .isISO8601().withMessage('Start date must be a valid date'),
  body('endDate')
    .isISO8601().withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('travelers')
    .optional()
    .isInt({ min: 1 }).withMessage('Travelers must be at least 1'),
  body('preferences')
    .optional()
    .isObject().withMessage('Preferences must be a valid object')
];

/**
 * ✅ Apply authentication middleware
 */
router.use(protect);

/**
 * ✅ Trip Routes
 */
/**
 * @desc    Route to download a trip itinerary as a PDF.
 * @route   GET /api/trips/:id/download
 */
router.get('/:id/download', downloadTripPdf);


// Get all trips (supports pagination and filters via query params)
router.get('/', getAllTrips);

// Get upcoming trips
router.get('/upcoming', getUpcomingTrips);

// Get trip by ID
router.get('/:id', getTripById);

// Generate AI itinerary for a trip
router.post('/:id/generate-ai-plan', generateAIPlan);

// Update trip (mainly preferences or status)
router.put(
  '/:id',
  tripValidationRules,
  validate,
  updateTrip
);

// Delete trip
router.delete('/:id', deleteTrip);

// Update trip status only
router.patch(
  '/:id/status',
  body('status')
    .isIn(['planned', 'ongoing', 'completed', 'canceled']).withMessage('Invalid status'),
  validate,
  updateTripStatus
);

module.exports = router;
