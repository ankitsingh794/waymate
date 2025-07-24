const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const expenseRoutes = require('./expenseRoutes');
const { mongoIdValidation } = require('../utils/validationHelpers'); 

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




// --- Main Trip Routes ---

router.get('/', getAllTrips);
router.get('/upcoming', getUpcomingTrips);

router.get('/:id/download', mongoIdValidation('id'), validate, downloadTripPdf);

router.get('/:id', mongoIdValidation('id'), validate, getTripById);

router.put('/:id', mongoIdValidation('id'), /* other validations */ validate, updateTrip);

// FIX: Correctly apply the validation middleware to the delete route
router.delete('/:id', mongoIdValidation('id'), validate, deleteTrip);

// Correct
router.post('/:tripId/invite', mongoIdValidation('tripId'), validate, inviteUserToTrip);

router.patch('/:tripId/members/:memberId/role', [
    mongoIdValidation('tripId'),
    mongoIdValidation('memberId')
], validate, updateMemberRole);

router.delete('/:tripId/members/:memberId', [
    mongoIdValidation('tripId'),
    mongoIdValidation('memberId')
], validate, removeMemberFromTrip);

router.patch('/:id/favorite', mongoIdValidation('id'), validate, toggleFavoriteStatus);

router.patch('/:id/status', mongoIdValidation('id'), /* other validations */ validate, updateTripStatus);

// Nested expense routes
router.use('/:tripId/expenses', mongoIdValidation('tripId'), validate, expenseRoutes);

module.exports = router;
