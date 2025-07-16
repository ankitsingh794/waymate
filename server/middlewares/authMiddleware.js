const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

exports.protect = async (req, res, next) => {
  let token;

  // ✅ Check Authorization header for Bearer token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // ✅ Support Internal API Key (for microservices)
  if (req.headers['x-api-key'] && req.headers['x-api-key'] === process.env.INTERNAL_API_KEY) {
    logger.info('Internal API key authenticated');
    return next();
  }

  // ✅ Check cookies for token (optional if using cookies)
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // ✅ No token found
  if (!token) {
    logger.warn('Unauthorized access - No token provided');
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: 'Not authorized: No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.debug(`Decoded JWT for user ID: ${decoded.id}`);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      logger.warn(`User not found for ID: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'User no longer exists'
      });
    }

    // ✅ Check account status
    if (user.accountStatus !== 'active') {
      logger.warn(`Access denied - User ${user.email} is ${user.accountStatus}`);
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: 'Account is not active'
      });
    }

    // ✅ Optional: Invalidate token if password changed after token issue
    if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime()) {
      logger.warn(`Token invalid - Password changed after token issued for user ${user.email}`);
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Token invalid - password changed recently'
      });
    }

    req.user = user;
    logger.info(`User authenticated: ${user.email}`);
    next();
  } catch (error) {
    logger.error(`Token verification failed: ${error.message}`);
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: 'Not authorized: Token invalid or expired'
    });
  }
};
