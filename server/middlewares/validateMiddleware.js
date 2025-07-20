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

    // ✅ Log validation errors with IP for better tracking
    logger.warn(`Validation failed | Path: ${req.originalUrl} | Method: ${req.method} | IP: ${req.ip}`, {
      user: req.user ? req.user.email : 'Guest',
      errors: formattedErrors
    });

    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: 'Validation error',
      errors: formattedErrors,
      ...(process.env.NODE_ENV === 'development' && { rawErrors: errors.array() })
    });
  }

  next();
};

module.exports = validate;
