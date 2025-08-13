const { body, param } = require('express-validator');


const mongoIdValidation = (paramName) => [
  param(paramName).isMongoId().withMessage(`URL parameter :${paramName} must be a valid MongoDB ObjectId.`),
];


const emailValidation = (fieldName = 'email') => [
  body(fieldName)
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),
];


const passwordValidation = (fieldName = 'password') => [
  body(fieldName)
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    .matches(/\d/).withMessage('Password must contain at least one number.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
    .matches(/[\W_]/).withMessage('Password must contain at least one special character.'),
];

module.exports = {
  mongoIdValidation,
  emailValidation,
  passwordValidation,
};