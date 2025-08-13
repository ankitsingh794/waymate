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
  body('name').notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Please provide a valid email.').normalizeEmail(),
  // Use the strong password validator
  passwordValidation('password'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required.'),
  // Enforce strong passwords on reset
  passwordValidation('password'),
];

const updatePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  // Enforce strong passwords on update
  passwordValidation('newPassword'),
];

// --- Public Routes with Rate Limiting ---

router.post('/register', generalLimiter, registerValidation, validate, authController.registerUser);

router.post('/verify-email', generalLimiter, [body('token').notEmpty()], validate, authController.verifyEmail);

router.post('/login', loginRateLimiter, loginValidation, validate, authController.loginUser);

router.post('/refresh-token', refreshLimiter, authController.refreshToken); 

router.post('/forgot-password', generalLimiter, [body('email').isEmail()], validate, authController.forgotPassword);

router.post('/reset-password', generalLimiter, resetPasswordValidation, validate, authController.resetPassword);


// Use PATCH for partial updates, a semantic improvement
router.patch('/update-password', protect, updatePasswordValidation, validate, authController.updatePassword);

router.post('/logout', protect, authController.logoutUser);

module.exports = router;