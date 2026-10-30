const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

const handleCastErrorDB = (err) => {
  const path = err.path || 'identifier';
  const message = `Invalid format for parameter: ${path}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  let value = 'field';
  if (err.keyValue && typeof err.keyValue === 'object') {
    const keys = Object.keys(err.keyValue);
    value = `${keys.join(', ')}`;
  } else {
    const rawMsg = err.errmsg || err.errorResponse?.errmsg || err.message || '';
    const match = rawMsg.match(/(["'])(\\?.)*?\1/);
    if (match && match[0]) {
      value = match[0];
    }
  }
  const message = `Duplicate value for ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors || {}).map((el) => el.message || 'Invalid input');
  const message = errors.length > 0 ? `Invalid input data: ${errors.join('. ')}` : 'Invalid input data.';
  return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid authentication token. Please log in again.', 401);
const handleJWTExpiredError = () => new AppError('Your session has expired. Please log in again.', 401);

const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('Uploaded file is too large. Please upload a smaller file.', 400);
  }
  return new AppError(`File upload error: ${err.message || 'Invalid upload'}`, 400);
};

/**
 * Development error responder: Provides safe diagnostic message without dumping raw DB internals.
 */
const sendErrorDev = (err, res) => {
  const responsePayload = {
    success: false,
    status: err.status,
    statusCode: err.statusCode,
    message: err.message,
  };

  // Only attach stack trace if specifically permitted for local debugging
  if (process.env.EXPOSE_STACK_TRACES === 'true') {
    responsePayload.stack = err.stack;
  }

  res.status(err.statusCode).json(responsePayload);
};

/**
 * Production error responder: Strict operational error sanitization.
 */
const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      statusCode: err.statusCode,
      message: err.message,
    });
  }

  // Log internal unexpected programming/system errors safely
  logger.error('CRITICAL INTERNAL ERROR', {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  return res.status(500).json({
    success: false,
    status: 'error',
    statusCode: 500,
    message: 'An internal error occurred. Please try again later.',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Map known database and library errors into trusted operational errors
  let error = err;

  if (err.name === 'CastError') {
    error = handleCastErrorDB(err);
  } else if (err.code === 11000) {
    error = handleDuplicateFieldsDB(err);
  } else if (err.name === 'ValidationError') {
    error = handleValidationErrorDB(err);
  } else if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  } else if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  } else if (err.name === 'MulterError') {
    error = handleMulterError(err);
  } else if (err.message && err.message.includes('CORS')) {
    error = new AppError('Request blocked by CORS policy.', 403);
  }

  // Ensure isOperational flag is preserved
  if (err.isOperational) {
    error.isOperational = true;
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    // Safely defaults to production shielding for production, staging, test, and unset environments
    sendErrorProd(error, res);
  }
};
