const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { loginRateLimiter, generalLimiter, refreshLimiter } = require('../middlewares/rateLimiter');
const { passwordValidation } = require('../utils/validationHelpers');

const router = express.Router();

// --- Validation Chains with Enhanced Security ---

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Please provide a valid email.').normalizeEmail(),
  passwordValidation('password'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required.'),
  passwordValidation('password'),
];

const updatePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  passwordValidation('newPassword'),
];

// --- Public Routes with Rate Limiting ---

router.post('/register', generalLimiter, registerValidation, validate, authController.registerUser);

router.post('/verify-email', generalLimiter, [body('token').notEmpty()], validate, authController.verifyEmail);

router.post('/login', loginRateLimiter, loginValidation, validate, authController.loginUser);

// UPDATED: Added validation for refreshToken in the body to support mobile clients
router.post(
    '/refresh-token', 
    refreshLimiter, 
    [
        // Allow token from either cookie or body to support both web and mobile
        body('refreshToken').optional().isJWT().withMessage('Invalid refresh token format.')
    ], 
    validate, 
    authController.refreshToken
);

router.post('/forgot-password', generalLimiter, [body('email').isEmail()], validate, authController.forgotPassword);

router.post('/reset-password', generalLimiter, resetPasswordValidation, validate, authController.resetPassword);

// --- Protected (Authenticated) Routes ---

router.patch('/update-password', protect, updatePasswordValidation, validate, authController.updatePassword);

// UPDATED: Added validation for refreshToken for server-side logout
router.post(
    '/logout', 
    protect, 
    [
        body('refreshToken').optional().isJWT().withMessage('Invalid refresh token format.')
    ], 
    validate, 
    authController.logoutUser
);

router.post(
    '/resend-verification',
    generalLimiter, // Added rate limiting
    [body('email').isEmail().withMessage('Please provide a valid email address.')],
    validate,
    authController.resendVerificationEmail
);

module.exports = router;
