const express = require('express');
const { body, query, param } = require('express-validator');
const { protect, isTripMember, isTripOwner } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { generalLimiter, strictLimiter } = require('../middlewares/rateLimiter');
const { mongoIdValidation } = require('../utils/validationHelpers');
const { requireConsent } = require('../middlewares/consentMiddleware');
const expenseRoutes = require('./expenseRoutes');
const tripController = require('../controllers/tripController');

const router = express.Router();

// Apply authentication middleware to all routes defined in this file.
router.use(protect);

// --- Validation Chains ---
const getAllTripsValidation = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.'),
    query('status').optional().isIn(['planned', 'ongoing', 'completed', 'canceled']).withMessage('Invalid status value.'),
    query('destination').optional().isString().trim()
];

const updateDetailsValidation = [
    body('name').optional().isString().trim().isLength({ min: 3 }),
    body('startDate').optional().isISO8601().toDate(),
    body('endDate').optional().isISO8601().toDate(),
    body('travelers').optional().isInt({ min: 1 }),
    body('status').optional().isIn(['planning', 'upcoming', 'active', 'completed', 'canceled']),
    body('preferences.accommodationType').optional().isString(),
    body('preferences.transportMode').optional().isIn(['flight', 'train', 'bus', 'car', 'any']),
    body('purpose').optional().isIn(['work', 'education', 'shopping', 'leisure', 'personal_business', 'other'])
];

const updateStatusValidation = [
    mongoIdValidation('id'),
    body('status').isIn(['planning', 'upcoming', 'active', 'completed', 'canceled']).withMessage('Invalid status provided.'),
    validate,
    isTripMember
];

const updateMemberRoleValidation = [
    mongoIdValidation('tripId'),
    mongoIdValidation('memberId'),
    body('role').isIn(['editor', 'viewer']).withMessage('Invalid role. Must be "editor" or "viewer".'),
    validate,
    isTripOwner // Only owner can change roles
];

const updateItineraryValidation = [
    mongoIdValidation('id'),
    param('day').isInt({ min: 1 }).withMessage('Day must be a valid number.'),
    body('activities').isArray().withMessage('Activities must be an array of strings.'),
    validate,
    isTripOwner // Only owner or editor can update itinerary
];

const updateMyDetailsValidation = [
    mongoIdValidation('tripId'),
    body('ageGroup').optional().isIn(['<18', '18-35', '36-60', '>60']),
    body('gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']),
    body('relation').optional().isString().trim(),
    validate,
    isTripMember,
    requireConsent('demographic_data')
];

// --- Main Trip Routes ---
router.route('/')
    .get(getAllTripsValidation, validate, tripController.getAllTrips);
    
router.post('/sync', body('trips').isArray(), validate, tripController.syncOfflineTrips);


// --- Invite Management ---
router.post('/accept-invite',
    generalLimiter,
    body('token').isString().notEmpty().withMessage('An invite token is required.'),
    validate,
    tripController.acceptTripInvite
);

// --- Routes for a Specific Trip ---
// All subsequent routes require a valid trip ID and trip membership.
router.route('/:id')
    .get(mongoIdValidation('id'), validate, isTripMember, tripController.getTripById)
    .delete(mongoIdValidation('id'), validate, isTripOwner, tripController.deleteTrip);

router.patch('/:id/details', mongoIdValidation('id'), updateDetailsValidation, validate, isTripMember, tripController.updateTripDetails);
router.get('/:id/download', strictLimiter, mongoIdValidation('id'), validate, isTripMember, tripController.downloadTripPdf);
router.patch('/:id/favorite', mongoIdValidation('id'), validate, isTripMember, tripController.toggleFavoriteStatus);
router.patch('/:id/status', updateStatusValidation, tripController.updateTripStatus);
router.post('/:id/generate-invite', generalLimiter, mongoIdValidation('id'), validate, isTripMember, tripController.generateInviteLink);
router.post('/:id/smart-schedule', mongoIdValidation('id'), validate, isTripMember, tripController.upgradeToSmartSchedule);

// --- Itinerary Management ---
router.patch('/:id/itinerary/:day', updateItineraryValidation, tripController.updateDayItinerary);

// --- Member Management ---
router.patch('/:tripId/members/me', updateMyDetailsValidation, tripController.updateMyMemberDetails);
router.patch('/:tripId/members/:memberId/role', updateMemberRoleValidation, tripController.updateMemberRole);
router.delete('/:tripId/members/:memberId', [mongoIdValidation('tripId'), mongoIdValidation('memberId')], validate, isTripOwner, tripController.removeMemberFromTrip);

// --- Nested Expense Routes ---
router.use('/:tripId/expenses', mongoIdValidation('tripId'), validate, isTripMember, expenseRoutes);

module.exports = router;
