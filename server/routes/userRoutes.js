const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  getUserProfile,
  updateUserProfile,
  updateUserPhoto,
  changeAccountStatus,
  updateUserLocation,
  ...userController
} = require('../controllers/userController');

const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { uploadSingleImage } = require('../middlewares/multer');
const { generalLimiter } = require('../middlewares/rateLimiter'); 
const { strictLimiter } = require('../middlewares/rateLimiter');
const ConsentLog = require('../models/ConsentLog');


// ✅ Validation Rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
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
    .trim()
    .isString()
    .withMessage('City must be a string'),
  body('location.country')
    .optional()
    .trim()
    .isString()
    .withMessage('Country must be a string')
];

// --- User Profile Routes ---
router.get('/profile', protect, getUserProfile);

// Added rate limiting to prevent spamming updates
router.patch('/profile', protect, generalLimiter, updateProfileValidation, validate, updateUserProfile);

// Endpoint to update user location
router.patch(
    '/profile/location', 
    protect, 
    strictLimiter, 
    updateUserLocation
);

// Endpoint to update user profile photo
router.patch(
    '/profile/photo',
    protect,
    generalLimiter, 
    uploadSingleImage('photo'),
    updateUserPhoto
);

// --- Admin Routes ---
router.patch('/:id/status',
  protect,
  authorizeRoles('admin'),
  [body('status').isIn(['active', 'suspended', 'banned']).withMessage('Status must be one of: active, suspended, or banned')],
  validate,
  changeAccountStatus
);

// --- User Consent Routes ---
router.post(
    '/profile/consent',
    protect,
    [
        body('consentType').isIn(['data_collection', 'demographic_data', 'passive_tracking']),
        body('status').isIn(['granted', 'revoked'])
    ],
    validate,
    userController.updateUserConsent 
);

module.exports = router;