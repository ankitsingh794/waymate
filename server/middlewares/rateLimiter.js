const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const logger = require('../utils/logger');
const { redisClient } = require('../config/redis');
const ipKeyGenerator = (req, res) => req.ip; 

// ✅ Custom handler for logging
const rateLimitHandler = (req, res, next, options) => {
  logger.warn('Rate limit hit', {
    ip: req.ip,
    endpoint: req.originalUrl,
    method: req.method,
    user: req.user ? req.user.email : 'Guest'
  });
  res.status(options.statusCode).json(options.message);
};

// ✅ Custom safe key generator wrapper
const customKeyGenerator = (extraKey = '') => (req, res) => {
  const baseKey = ipKeyGenerator(req, res); // Safe IP handling for IPv6
  return extraKey ? `${extraKey}:${baseKey}` : baseKey;
};

// ✅ OTP limiter
const otpRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: 'otpLimiter'
  }),
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (req, res) => `${req.body.email || 'unknown'}:${ipKeyGenerator(req, res)}`,
  message: { success: false, message: 'Too many OTP requests. Please try again later.' },
  handler: rateLimitHandler
});

// ✅ Login limiter
const loginRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: 'loginLimiter'
  }),
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req, res) => `${req.body.email || 'unknown'}:${ipKeyGenerator(req, res)}`,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
  handler: rateLimitHandler
});

// Trip creation limiter
const tripCreationLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: 'tripLimiter'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req, res) => `trip:${req.user ? req.user._id : ipKeyGenerator(req, res)}`,
  message: { success: false, message: 'Too many trip creation attempts. Please try again later.' },
  handler: rateLimitHandler
});

/// Group creation limiter
const groupCreationLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: 'groupCreateLimiter'
    }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Max 10 groups per hour per user
    keyGenerator: (req, res) => `group-create:${req.user ? req.user._id : ipKeyGenerator(req, res)}`,
    message: { success: false, message: 'You have created too many groups. Please try again later.' },
    handler: rateLimitHandler
});

// Rate limiter for sending chat messages
const messageLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: 'messageLimiter'
    }),
    windowMs: 1 * 60 * 1000, 
    max: 30, 
    keyGenerator: (req, res) => `message-send:${req.user ? req.user._id : ipKeyGenerator(req, res)}`,
    message: { success: false, message: 'You are sending messages too quickly. Please slow down.' },
    handler: rateLimitHandler
});


// Global limiter
const globalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: 'globalLimiter'
  }),
  windowMs: 15 * 60 * 1000,
  max: 200, 
  keyGenerator: ipKeyGenerator,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  handler: rateLimitHandler
});

module.exports = { 
    otpRateLimiter, 
    loginRateLimiter, 
    tripCreationLimiter, 
    globalLimiter,
    groupCreationLimiter, 
    messageLimiter,      
    customKeyGenerator 
};
