const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

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

    // ✅ Log validation errors
    logger.warn(`Validation failed | Path: ${req.originalUrl} | Method: ${req.method}`, {
      user: req.user ? req.user.email : 'Guest',
      errors: formattedErrors
    });

    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: 'Validation error',
      errors: formattedErrors,
      ...(process.env.NODE_ENV === 'development' && { rawErrors: errors.array() }) // Extra info for dev
    });
  }

  next();
};

module.exports = validate;
