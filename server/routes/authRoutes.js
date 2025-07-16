const express = require('express');
const { body } = require('express-validator');
const {
  registerUser,
  loginUser,
  sendOtp,
  verifyOtp,
  resetPassword,
  updatePassword,
  getCurrentUser,
  logoutUser,
  refreshToken
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { otpRateLimiter, loginRateLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

/**
 * ✅ Validation Rules
 */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('email')
    .isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  body('email')
    .isEmail().withMessage('Valid email is required'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

const sendOtpValidation = [
  body('email')
    .isEmail().withMessage('Valid email is required')
];

const verifyOtpValidation = [
  body('email')
    .isEmail().withMessage('Valid email is required'),
  body('otp')
    .isNumeric().withMessage('OTP must be numeric')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
];

const resetPasswordValidation = [
  body('email')
    .isEmail().withMessage('Valid email is required'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

/**
 * ✅ Public Routes
 */

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', registerValidation, validate, registerUser);

// @route   POST /api/auth/login
// @desc    Login user and get access & refresh tokens (with rate limiter)
router.post('/login', loginRateLimiter, loginValidation, validate, loginUser);

// @route   POST /api/auth/refresh-token
// @desc    Generate new access token using refresh token
router.post('/refresh-token', refreshToken);

// @route   POST /api/auth/send-otp
// @desc    Send OTP to email for password reset (with rate limiter)
router.post('/send-otp', otpRateLimiter, sendOtpValidation, validate, sendOtp);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP
router.post('/verify-otp', verifyOtpValidation, validate, verifyOtp);

// @route   POST /api/auth/reset-password
// @desc    Reset password after OTP verification
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
// @desc    Logout user and clear refresh token
router.post('/logout', protect, logoutUser);

module.exports = router;
