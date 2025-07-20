const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { sendResponse } = require('../utils/responseHelper');
const { isTokenBlacklisted } = require('../config/redis');

/**
 * Protect routes - Validate JWT token
 */
exports.protect = async (req, res, next) => {
  let token;

  // ✅ Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // ✅ Internal API key for microservices
  if (req.headers['x-api-key'] && req.headers['x-api-key'] === process.env.INTERNAL_API_KEY) {
    logger.info('Internal API key authenticated');
    return next();
  }

  // ✅ Check cookies (optional)
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  // ✅ No token
  if (!token) {
    logger.warn('Unauthorized - No token provided');
    return sendResponse(res, 401, false, 'Not authorized: No token provided');
  }

  try {
    // ✅ Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.debug(`Decoded JWT for user ID: ${decoded.id}`);

    // ✅ Future: Check if token is blacklisted in Redis
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) return sendResponse(res, 401, false, 'Token is invalidated');

    // ✅ Fetch user
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      logger.warn(`User not found for ID: ${decoded.id}`);
      return sendResponse(res, 401, false, 'User no longer exists');
    }

    // ✅ Check account status
    if (user.accountStatus !== 'active') {
      logger.warn(`Access denied - User ${user.email} is ${user.accountStatus}`);
      return sendResponse(res, 403, false, `Account is ${user.accountStatus}`);
    }

    // ✅ Invalidate token if password changed
    if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime()) {
      logger.warn(`Token invalid - Password changed after token issue for ${user.email}`);
      return sendResponse(res, 401, false, 'Token invalid - password changed recently');
    }

    // ✅ Attach user to request
    req.user = user;
    logger.info(`User authenticated: ${user.email}`);
    next();
  } catch (error) {
    logger.error(`JWT verification failed: ${error.message}`);
    return sendResponse(res, 401, false, 'Not authorized: Token invalid or expired');
  }
};

/**
 * Role-based access control
 */
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied - ${req.user.role} tried to access ${req.originalUrl}`);
      return sendResponse(res, 403, false, 'Access denied - insufficient permissions');
    }
    next();
  };
};
