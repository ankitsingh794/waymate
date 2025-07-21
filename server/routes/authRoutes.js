const express = require('express');
const { body } = require('express-validator');
const {
  registerUser,
  verifyEmail,
  loginUser,
  forgotPassword,
  resetPassword,
  updatePassword,
  logoutUser,
  refreshToken
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { loginRateLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

// --- Validation Chains ---

const registerValidation = [
  body('name').notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Please provide a valid email.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.')
];

const verifyEmailValidation = [
  body('token').notEmpty().withMessage('Verification token is required.')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email.'),
  body('password').notEmpty().withMessage('Password is required.')
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Please provide a valid email.')
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required.'),
  body('password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long.')
];

const updatePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long.')
];


// --- Public Routes ---

router.post('/register', registerValidation, validate, registerUser);
router.post('/verify-email', verifyEmailValidation, validate, verifyEmail);
router.post('/login', loginValidation, validate, loginRateLimiter, loginUser);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPasswordValidation, validate, forgotPassword);
router.post('/reset-password', resetPasswordValidation, validate, resetPassword);

// --- Private Routes ---

router.put('/update-password', protect, updatePasswordValidation, validate, updatePassword);
router.post('/logout', protect, logoutUser);

module.exports = router;