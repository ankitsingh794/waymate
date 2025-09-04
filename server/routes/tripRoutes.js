const express = require('express');
const { body, query } = require('express-validator');
const { protect } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { isTripMember, isTripOwner } = require('../middlewares/authMiddleware');
const { generalLimiter, strictLimiter } = require('../middlewares/rateLimiter');
const { mongoIdValidation } = require('../utils/validationHelpers');
const expenseRoutes = require('./expenseRoutes');
const tripController = require('../controllers/tripController');
const { param } = require('express-validator');
const { requireConsent } = require('../middlewares/consentMiddleware');

const router = express.Router();

// Apply authentication to all routes in this file
router.use(protect);

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



// --- Main Trip Routes ---
router.route('/')
    .get(getAllTripsValidation, validate, tripController.getAllTrips)


// --- Routes for a Specific Trip ---
// 🔒 All these routes now require the user to be a member of the trip.
router.route('/:id')
    .get(mongoIdValidation('id'), isTripMember, validate, tripController.getTripById)
    .delete(mongoIdValidation('id'), isTripOwner, validate, tripController.deleteTrip);

router.patch('/:id/details', mongoIdValidation('id'), isTripMember, updateDetailsValidation, validate, tripController.updateTripDetails);

router.get('/:id/download', strictLimiter, mongoIdValidation('id'), isTripMember, validate, tripController.downloadTripPdf);

router.patch('/:id/favorite', mongoIdValidation('id'), isTripMember, validate, tripController.toggleFavoriteStatus);

router.patch('/:id/status',
    mongoIdValidation('id'),
    body('status').isIn(['planning', 'upcoming', 'active', 'completed']).withMessage('Invalid status provided.'),
    isTripMember,
    validate,
    tripController.updateTripStatus
);

// --- Invite Management ---
router.post('/:id/generate-invite', generalLimiter, mongoIdValidation('id'), validate, isTripMember, tripController.generateInviteLink);

router.post('/accept-invite',
    generalLimiter,
    body('token').isString().notEmpty().withMessage('An invite token is required.'),
    validate,
    tripController.acceptTripInvite
);

// --- Member Management ---
router.patch('/:tripId/members/:memberId/role',
    [mongoIdValidation('tripId'), mongoIdValidation('memberId')],
    body('role').isIn(['editor', 'viewer']).withMessage('Invalid role. Must be "editor" or "viewer".'),
    validate,
    isTripOwner, // Only the owner can change roles
    tripController.updateMemberRole
);

router.delete('/:tripId/members/:memberId',
    [mongoIdValidation('tripId'), mongoIdValidation('memberId')],
    validate,
    isTripOwner, // Only the owner can remove members
    tripController.removeMemberFromTrip
);

// --- Nested Expense Routes ---
router.use('/:tripId/expenses', mongoIdValidation('tripId'), validate, isTripMember, expenseRoutes);

// --- Smart Schedule Upgrade ---
router.post('/:id/smart-schedule', isTripMember, tripController.upgradeToSmartSchedule);

// --- Itinerary Management (Day wise)---
router.patch('/:id/itinerary/:day',
    [
        mongoIdValidation('id'),
        param('day').isInt({ min: 1 }).withMessage('Day must be a valid number.'),
        body('activities').isArray().withMessage('Activities must be an array of strings.')
    ],
    validate,
    tripController.updateDayItinerary
);


router.patch('/:tripId/members/me',
    [
        mongoIdValidation('tripId'),
        body('ageGroup').optional().isIn(['<18', '18-35', '36-60', '>60']),
        body('gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']),
        body('relation').optional().isString().trim()
    ],
    validate,
    isTripMember, // User must be a member of the trip
    requireConsent('demographic_data'), // User must have consented to share this data
    tripController.updateMyMemberDetails
);

router.post(
    '/sync',
    body('trips').isArray().withMessage('Sync data must be an array of trips.'),
    validate,
    tripController.syncOfflineTrips
);


module.exports = router;