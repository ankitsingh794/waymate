const logger = require('../utils/logger');
const multer = require('multer');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  const errorId = crypto.randomBytes(6).toString('hex'); // Unique error trace ID

  // ✅ Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // ✅ Mongoose CastError (Invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // ✅ Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 400;
    const fields = Object.keys(err.keyValue).join(', ');
    message = `Duplicate value for field: ${fields}. Use another value.`;
  }

  // ✅ JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token, please log in again';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired, please log in again';
  }

  // ✅ Multer Errors
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large. Max size is 2MB';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Invalid file type. Only jpeg, jpg, png, webp allowed';
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // ✅ Express Validator Errors (optional)
  if (!err.name && validationResult(req).array().length > 0) {
    statusCode = 422;
    message = validationResult(req).array().map(err => `${err.param}: ${err.msg}`).join(', ');
  }

  // ✅ Log with Winston
  logger.error(`Error ID: ${errorId} | ${message}`, {
    statusCode,
    method: req.method,
    url: req.originalUrl,
    user: req.user ? req.user.email : 'Guest',
    ip: req.ip,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // ✅ Final response
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errorId, // for debugging
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
