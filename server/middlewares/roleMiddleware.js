const logger = require('../utils/logger');

/**
 * Role-based authorization middleware
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'moderator', 'user')
 */
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // ✅ Check if user object is attached by auth middleware
    if (!req.user) {
      logger.warn(`Access denied: No authenticated user | Path: ${req.originalUrl} | Method: ${req.method}`);
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Not authorized: user not authenticated'
      });
    }

    // ✅ Check if user role is allowed OR user is admin (override)
    const hasPermission = roles.includes(req.user.role) || (req.user.isAdmin && roles.includes('admin'));

    if (!hasPermission) {
      logger.warn(`Access denied for user: ${req.user.email} | Role: ${req.user.role} | Required roles: ${roles.join(', ')}`);
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: 'Access denied: insufficient permissions'
      });
    }

    logger.info(`Access granted for user: ${req.user.email} | Role: ${req.user.role}`);
    next();
  };
};
