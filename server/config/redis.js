const redis = require('redis');
const logger = require('../utils/logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// ✅ Create Redis client
const redisClient = redis.createClient({ url: REDIS_URL });

// ✅ Event listeners
redisClient.on('connect', () => logger.info('✅ Redis connected successfully'));
redisClient.on('error', (err) => logger.error('❌ Redis connection error', { error: err }));

// ✅ Connect Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Redis connection failed', { error: error.message });
  }
})();

/**
 * ✅ Set cache with TTL
 */
const setCache = async (key, data, ttl = 3600) => {
  try {
    await redisClient.set(key, JSON.stringify(data), { EX: ttl });
    logger.debug(`✅ Redis set key: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    logger.error('Redis setCache error', { key, error: error.message });
  }
};

/**
 * ✅ Get cached data
 */
const getCache = async (key) => {
  try {
    const result = await redisClient.get(key);
    return result ? JSON.parse(result) : null;
  } catch (error) {
    logger.error('Redis getCache error', { key, error: error.message });
    return null;
  }
};

/**
 * ✅ Delete cache key
 */
const deleteCache = async (key) => {
  try {
    await redisClient.del(key);
    logger.debug(`✅ Redis deleted key: ${key}`);
  } catch (error) {
    logger.error('Redis deleteCache error', { key, error: error.message });
  }
};

/**
 * ✅ Check if a token is in the blacklist
 */
const isTokenBlacklisted = async (token) => {
  try {
    const result = await redisClient.get(`bl_${token}`);
    return result !== null;
  } catch (error) {
    logger.error('Redis isTokenBlacklisted error', { error: error.message });
    return false;
  }
};

/**
 * ✅ Blacklist a token with TTL
 */
const blacklistToken = async (token, ttl) => {
  try {
    await redisClient.set(`bl_${token}`, 'blacklisted', { EX: ttl });
    logger.debug(`✅ Token blacklisted for ${ttl}s`);
  } catch (error) {
    logger.error('Redis blacklistToken error', { error: error.message });
  }
};

/**
 * ✅ Increment a key (with monthly TTL for API usage tracking)
 */
const incrCache = async (key, increment = 1, ttl = 2592000) => {
  try {
    const newValue = await redisClient.incrBy(key, increment);
    if (newValue === increment) {
      // Key is newly created, set TTL
      await redisClient.expire(key, ttl);
    }
    return newValue;
  } catch (error) {
    logger.error('Redis incrCache error', { key, error: error.message });
    return null;
  }
};

module.exports = {
  redisClient,
  setCache,
  getCache,
  deleteCache,
  isTokenBlacklisted,
  blacklistToken,
  incrCache
};
