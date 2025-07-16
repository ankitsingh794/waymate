const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

exports.protect = async (req, res, next) => {
  let token;

  // Support Bearer Token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Support API Key for internal services
  if (req.headers['x-api-key'] && req.headers['x-api-key'] === process.env.INTERNAL_API_KEY) {
    logger.info('Internal API key authenticated');
    return next();
  }

  if (!token) {
    logger.warn('Unauthorized access - No token provided');
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.debug(`Decoded JWT for user ID: ${decoded.id}`);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      logger.warn(`User not found for ID: ${decoded.id}`);
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    if (user.accountStatus !== 'active') {
      logger.warn(`Access denied - User ${user.email} is ${user.accountStatus}`);
      return res.status(403).json({ success: false, message: 'Account is not active' });
    }

    req.user = user;
    logger.info(`User authenticated: ${user.email}`);
    next();
  } catch (error) {
    logger.error(`Token verification failed: ${error.message}`);
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
  }
};
