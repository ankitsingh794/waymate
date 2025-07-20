const express = require('express');
const { body } = require('express-validator');
const {
  registerUser,
  verifyEmail, 
  loginUser,
  forgotPassword, 
  resetPassword,
  updatePassword,
  getCurrentUser,
  logoutUser,
  refreshToken
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { loginRateLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

/**
 * ✅ Validation Rules
 */
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required')
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Token is required'),
  body('password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

const updatePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

/**
 * ✅ Public Routes
 */

// @route   POST /api/auth/register
// @desc    Register a new user and send verification email
router.post('/register', registerValidation, validate, registerUser);

// @route   POST /api/auth/verify-email
// @desc    Verify email using token from link
router.post('/verify-email', body('token').notEmpty().withMessage('Token is required'), validate, verifyEmail);

// @route   POST /api/auth/login
// @desc    Login user
router.post('/login', loginRateLimiter, loginValidation, validate, loginUser);

// @route   POST /api/auth/refresh-token
// @desc    Generate new access token
router.post('/refresh-token', refreshToken);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset link to email
router.post('/forgot-password', forgotPasswordValidation, validate, forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password using token from link
router.post('/reset-password', resetPasswordValidation, validate, resetPassword);

/**
 * ✅ Private Routes
 */

// @route   GET /api/auth/me
// @desc    Get current logged-in user
router.get('/me', protect, getCurrentUser);

// @route   PUT /api/auth/update-password
// @desc    Update password for logged-in user
router.put('/update-password', protect, updatePasswordValidation, validate, updatePassword);

// @route   POST /api/auth/logout
// @desc    Logout user
router.post('/logout', protect, logoutUser);

module.exports = router;
