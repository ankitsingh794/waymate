const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const logger = require('../utils/logger');
const { redisClient } = require('../config/redis');

/**
 * Safely extracts client IP, removing IPv6 mapped prefixes
 */
const ipKeyGenerator = (req) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  return typeof ip === 'string' ? ip.replace(/^::ffff:/, '') : '127.0.0.1';
};

/**
 * Custom handler for logging rate-limited requests
 */
const rateLimitHandler = (req, res, next, options) => {
  logger.warn('Rate limit exceeded', {
    ip: ipKeyGenerator(req),
    endpoint: req.originalUrl,
    user: req.user ? req.user.email : 'Guest',
  });
  res.status(options.statusCode).json({
    success: false,
    statusCode: options.statusCode,
    message: typeof options.message === 'object' ? options.message.message : options.message,
  });
};

/**
 * Creates a safe RedisStore wrapper that doesn't crash on connection drop
 */
const createSafeStore = (prefix) => {
  return new RedisStore({
    sendCommand: async (...args) => {
      try {
        if (!redisClient.isOpen) {
          throw new Error('Redis client is not connected');
        }
        return await redisClient.sendCommand(args);
      } catch (err) {
        logger.debug(`[RateLimiter Redis Bypass] Fallback due to: ${err.message}`);
        throw err; // express-rate-limit with passOnStoreError: true will gracefully bypass
      }
    },
    prefix,
  });
};

// Safe key generator wrapper
const customKeyGenerator = (extraKey = '') => (req) => {
  const baseKey = ipKeyGenerator(req);
  return extraKey ? `${extraKey}:${baseKey}` : baseKey;
};

// OTP limiter
const otpRateLimiter = rateLimit({
  store: createSafeStore('otpLimiter'),
  passOnStoreError: true,
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const email = req.body?.email && typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : 'unknown';
    return `${email}:${ipKeyGenerator(req)}`;
  },
  message: { success: false, message: 'Too many OTP requests. Please try again later.' },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Login limiter
const loginRateLimiter = rateLimit({
  store: createSafeStore('loginLimiter'),
  passOnStoreError: true,
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const email = req.body?.email && typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : 'unknown';
    return `${email}:${ipKeyGenerator(req)}`;
  },
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Trip creation limiter
const tripCreationLimiter = rateLimit({
  store: createSafeStore('tripLimiter'),
  passOnStoreError: true,
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `trip:${req.user ? req.user._id : ipKeyGenerator(req)}`,
  message: { success: false, message: 'Too many trip creation attempts. Please try again later.' },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Group creation limiter
const groupCreationLimiter = rateLimit({
  store: createSafeStore('groupCreateLimiter'),
  passOnStoreError: true,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15,
  keyGenerator: (req) => `group-create:${req.user ? req.user._id : ipKeyGenerator(req)}`,
  message: { success: false, message: 'You have created too many groups. Please try again later.' },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for sending chat messages
const messageLimiter = rateLimit({
  store: createSafeStore('messageLimiter'),
  passOnStoreError: true,
  windowMs: 1 * 60 * 1000,
  max: 60,
  keyGenerator: (req) => `message-send:${req.user ? req.user._id : ipKeyGenerator(req)}`,
  message: { success: false, message: 'You are sending messages too quickly. Please slow down.' },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Refresh limiter
const refreshLimiter = rateLimit({
  store: createSafeStore('refreshLimiter'),
  passOnStoreError: true,
  windowMs: 5 * 60 * 1000, // 5 mins
  max: 100,
  message: { success: false, message: 'Too many token refresh attempts.' },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Global limiter
const globalLimiter = rateLimit({
  store: createSafeStore('globalLimiter'),
  passOnStoreError: true,
  windowMs: 15 * 60 * 1000,
  max: 400,
  keyGenerator: ipKeyGenerator,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  store: createSafeStore('generalLimiter'),
  passOnStoreError: true,
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyGenerator: ipKeyGenerator,
  handler: rateLimitHandler,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for expensive operations (e.g., PDF generation, AI calls, exports)
const strictLimiter = rateLimit({
  store: createSafeStore('strictLimiter'),
  passOnStoreError: true,
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: (req) => (req.user ? `strict:${req.user._id}` : `strict:${ipKeyGenerator(req)}`),
  handler: rateLimitHandler,
  message: { success: false, message: 'Too many requests for this resource. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  otpRateLimiter,
  loginRateLimiter,
  tripCreationLimiter,
  globalLimiter,
  groupCreationLimiter,
  messageLimiter,
  customKeyGenerator,
  generalLimiter,
  strictLimiter,
  refreshLimiter,
};
