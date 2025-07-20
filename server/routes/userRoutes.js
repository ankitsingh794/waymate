const express = require('express');
const router = express.Router();

// ✅ Controllers
const {
  getUserProfile,
  updateUserProfile,
  changeAccountStatus
} = require('../controllers/userController');

// ✅ Middlewares
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const upload = require('../middlewares/multer');
const validate = require('../middlewares/validateMiddleware');

// ✅ Validators
const { body } = require('express-validator');

// ✅ Validation Rules
const updateProfileValidation = [
  body('name')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('preferences.language')
    .optional()
    .isString()
    .withMessage('Language must be a string'),
  body('preferences.currency')
    .optional()
    .isString()
    .withMessage('Currency must be a string'),
  body('location.city')
    .optional()
    .isString()
    .withMessage('City must be a string'),
  body('location.country')
    .optional()
    .isString()
    .withMessage('Country must be a string'),
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of [longitude, latitude]')
];

// ✅ Routes

// Get current user profile
router.get('/profile', protect, getUserProfile);

// Update user profile
router.put('/profile', protect, updateProfileValidation, validate, updateUserProfile);


// Admin: Change account status
router.put('/:id/status', protect, authorizeRoles('admin'), [
  body('status')
    .isIn(['active', 'suspended', 'banned'])
    .withMessage('Status must be one of active, suspended, banned')
], validate, changeAccountStatus);

module.exports = router;
