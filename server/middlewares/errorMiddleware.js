const logger = require('../utils/logger');

/**
 * Global Error Handling Middleware
 * Handles all application errors and returns a consistent response
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // ✅ Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // ✅ Handle Mongoose Bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // ✅ Handle Duplicate Key Error
  if (err.code && err.code === 11000) {
    statusCode = 400;
    const fields = Object.keys(err.keyValue).join(', ');
    message = `Duplicate field value: ${fields}. Please use another value.`;
  }

  // ✅ Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token, please log in again';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired, please log in again';
  }

  // ✅ Log error with Winston
  logger.error('Error occurred', {
    statusCode,
    message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // ✅ Send JSON response
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    // Show stack only in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
