const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * General Rate Limiter for OTP endpoints
 * - Prevents abuse of OTP requests (brute force attacks)
 */
const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Limit each IP to 5 OTP requests per window
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again later.'
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit hit on OTP route`, {
      ip: req.ip,
      endpoint: req.originalUrl
    });
    res.status(options.statusCode).json(options.message);
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false // Disable X-RateLimit-* headers
});

/**
 * General Rate Limiter for Login attempts
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 login attempts
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.'
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit hit on login route`, {
      ip: req.ip,
      endpoint: req.originalUrl
    });
    res.status(options.statusCode).json(options.message);
  }
});

module.exports = {
  otpRateLimiter,
  loginRateLimiter
};
