const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// Explicitly import controller functions for better readability and maintainability
const {
  getUserProfile,
  updateUserProfile,
  updateUserPhoto,
  changeAccountStatus,
  updateUserLocation,
  updateUserConsent
} = require('../controllers/userController');

const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { uploadSingleImage } = require('../middlewares/multer');
const { generalLimiter, strictLimiter } = require('../middlewares/rateLimiter'); 

// Validation rules for updating a user profile
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('preferences.language')
    .optional()
    .isString().withMessage('Language must be a string'),
  body('preferences.currency')
    .optional()
    .isString().withMessage('Currency must be a string'),
  body('location.city')
    .optional()
    .trim()
    .isString().withMessage('City must be a string'),
  body('location.country')
    .optional()
    .trim()
    .isString().withMessage('Country must be a string')
];

// --- User Profile Routes (for the authenticated user) ---

// Get user profile
router.get('/profile', protect, getUserProfile);

// Update user profile text details
router.patch('/profile', 
  protect, 
  generalLimiter, 
  updateProfileValidation, 
  validate, 
  updateUserProfile
);

// Update user live geo-location
router.patch('/profile/location', 
  protect, 
  strictLimiter, // Stricter rate limit for frequent updates
  updateUserLocation
);

// Update user profile photo
router.patch('/profile/photo',
  protect,
  generalLimiter, 
  uploadSingleImage('photo'), // Multer middleware for single file upload
  updateUserPhoto
);

// Update user consent status
router.post('/profile/consent',
    protect,
    [
        body('consentType').isIn(['data_collection', 'demographic_data', 'passive_tracking']).withMessage('Invalid consent type provided.'),
        body('status').isIn(['granted', 'revoked']).withMessage('Status must be either "granted" or "revoked".')
    ],
    validate,
    updateUserConsent
);

// --- Admin-Only Routes ---

// Change a specific user's account status
router.patch('/:id/status',
  protect,
  authorizeRoles('admin'),
  [body('status').isIn(['active', 'suspended', 'banned']).withMessage('Status must be one of: active, suspended, or banned')],
  validate,
  changeAccountStatus
);

module.exports = router;
