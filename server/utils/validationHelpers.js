const { body, param } = require('express-validator');
const mongoose = require('mongoose');

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

/**
 * Escapes special regular expression characters to prevent ReDoS and regex injection.
 * @param {string} str - Raw user input string.
 * @returns {string} Escaped string safe for RegExp or MongoDB $regex queries.
 */
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Validates if a string is a valid MongoDB ObjectId.
 * @param {string} id - Candidate ObjectId string.
 * @returns {boolean} True if valid ObjectId.
 */
const isValidObjectId = (id) => {
  if (!id) return false;
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
};

module.exports = {
  mongoIdValidation,
  emailValidation,
  passwordValidation,
  escapeRegex,
  isValidObjectId,
};
