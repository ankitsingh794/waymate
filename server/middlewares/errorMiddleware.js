const logger = require('../utils/logger');
const multer = require('multer');
const { validationResult } = require('express-validator');

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

  // ✅ Handle Multer Errors
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

  // ✅ Log error with Winston (with more context)
  logger.error(`Error: ${message}`, {
    statusCode,
    path: req.originalUrl,
    method: req.method,
    user: req.user ? req.user.email : 'Guest',
    ip: req.ip,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // ✅ Send JSON response
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
