const { validationResult } = require('express-validator');
const logger = require('../utils/logger'); // Optional, use Winston if available

/**
 * Middleware to handle validation errors from express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));

    // Log validation errors for debugging
    logger.warn('Validation failed', { errors: formattedErrors, path: req.originalUrl });

    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: 'Validation error',
      errors: formattedErrors
    });
  }

  next();
};

module.exports = validate;
