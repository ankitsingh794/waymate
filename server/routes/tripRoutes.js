const express = require('express');
const { body, param } = require('express-validator');
const { protect } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const expenseRoutes = require('./expenseRoutes');

const {
  downloadTripPdf,
  getAllTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  getUpcomingTrips,
  updateTripStatus,
  inviteUserToTrip,
  toggleFavoriteStatus,
  updateMemberRole,
  removeMemberFromTrip
} = require('../controllers/tripController');

const router = express.Router();
router.use(protect);

// --- Validation Chains ---

const mongoIdValidation = (idName) => [
  param(idName).isMongoId().withMessage(`Invalid ${idName} format.`)
];

const updateTripValidation = [
  body('destination').optional().isString().trim().notEmpty().withMessage('Destination cannot be empty.'),
  body('startDate').optional().isISO8601().withMessage('Invalid start date format.'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date format.')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.startDate || req.trip.startDate)) {
        throw new Error('End date must be after start date.');
      }
      return true;
    }),
  body('preferences').optional().isObject(),
  body('favorite').optional().isBoolean().withMessage('Favorite must be a boolean value.')
];

const updateTripStatusValidation = [
  body('status').isIn(['planned', 'ongoing', 'completed', 'canceled']).withMessage('Invalid status value.')
];

const inviteUserValidation = [
  body('email').isEmail().withMessage('Please provide a valid user email.')
];

const updateMemberRoleValidation = [
  body('role').isIn(['editor', 'viewer']).withMessage('Role must be "editor" or "viewer".')
];


// --- Main Trip Routes ---

router.get('/', getAllTrips);
router.get('/upcoming', getUpcomingTrips);
router.get('/:id/download', mongoIdValidation('id'), validate, downloadTripPdf);
router.get('/:id', mongoIdValidation('id'), validate, getTripById);
router.put('/:id', mongoIdValidation('id'), updateTripValidation, validate, updateTrip);
router.delete('/:id', mongo_idValidation('id'), validate, deleteTrip);

// --- Favorite and Status Routes ---

router.patch('/:id/favorite', mongoIdValidation('id'), validate, toggleFavoriteStatus);
router.patch('/:id/status', mongoIdValidation('id'), updateTripStatusValidation, validate, updateTripStatus);

// --- Member Management Routes ---

router.post('/:tripId/invite', mongoIdValidation('tripId'), inviteUserValidation, validate, inviteUserToTrip);
router.patch('/:tripId/members/:memberId/role', mongoIdValidation('tripId'), mongoIdValidation('memberId'), updateMemberRoleValidation, validate, updateMemberRole);
router.delete('/:tripId/members/:memberId', mongoIdValidation('tripId'), mongoIdValidation('memberId'), validate, removeMemberFromTrip);

// --- Nested Expense Routes ---

router.use('/:tripId/expenses', mongoIdValidation('tripId'), validate, expenseRoutes);

module.exports = router;