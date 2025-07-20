const logger = require('../utils/logger');

/**
 * Role-based authorization middleware
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'moderator', 'user')
 */
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn(`Access denied: No authenticated user | Path: ${req.originalUrl} | IP: ${req.ip}`);
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Not authorized: User not authenticated'
      });
    }

    // ✅ If no roles specified, allow any authenticated user
    if (roles.length === 0) {
      logger.info(`Access granted (no role restriction) | User: ${req.user.email} | IP: ${req.ip}`);
      return next();
    }

    // ✅ Check if user's role is in allowed roles
    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied | User: ${req.user.email} | Role: ${req.user.role} | Required: ${roles.join(', ')} | IP: ${req.ip}`);
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: 'Access denied: Insufficient permissions'
      });
    }

    logger.info(`Access granted | User: ${req.user.email} | Role: ${req.user.role} | IP: ${req.ip}`);
    next();
  };
};
