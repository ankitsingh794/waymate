// FILE: redis.js

const redis = require('redis');
const logger = require('../utils/logger');

// --- Enhancements Start ---
// 1. Defined constants for "magic numbers" and prefixes for better readability and maintenance.
const ONE_HOUR_IN_SECONDS = 3600;
const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;
const TOKEN_BLACKLIST_PREFIX = 'bl_';
// --- Enhancements End ---

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisClient = redis.createClient({ url: REDIS_URL });

redisClient.on('connect', () => logger.info('✅ Redis connected successfully'));
redisClient.on('error', (err) => logger.error('❌ Redis client error', { error: err }));

(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('❌ Redis initial connection failed', { error: error.message });
  }
})();

const setCache = async (key, data, ttl = ONE_HOUR_IN_SECONDS) => {
  try {
    await redisClient.set(key, JSON.stringify(data), { EX: ttl });
    logger.debug(`✅ Redis SET key: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    logger.error('Redis setCache error', { key, error: error.message });
  }
};

/**
 * Gets cached data from Redis.
 * Note: This function deliberately returns null on error to prevent cache
 * failures from crashing the application, treating a cache error as a cache miss.
 * @param {string} key The key to retrieve.
 * @returns {Promise<object|null>} The parsed object, or null if not found or on error.
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

const deleteCache = async (key) => {
  try {
    await redisClient.del(key);
    logger.debug(`✅ Redis DELETED key: ${key}`);
  } catch (error) {
    logger.error('Redis deleteCache error', { key, error: error.message });
  }
};

const isTokenBlacklisted = async (token) => {
  try {
    const key = `${TOKEN_BLACKLIST_PREFIX}${token}`;
    const result = await redisClient.get(key);
    return result !== null;
  } catch (error) {
    logger.error('Redis isTokenBlacklisted error', { error: error.message });
    return false; // Fail safely: if Redis is down, don't lock users out.
  }
};

const blacklistToken = async (token, ttl) => {
  try {
    const key = `${TOKEN_BLACKLIST_PREFIX}${token}`;
    await redisClient.set(key, 'blacklisted', { EX: ttl });
    logger.debug(`✅ Token blacklisted with key ${key} for ${ttl}s`);
  } catch (error) {
    logger.error('Redis blacklistToken error', { error: error.message });
  }
};

const incrCache = async (key, increment = 1, ttl = THIRTY_DAYS_IN_SECONDS) => {
  try {
    const newValue = await redisClient.incrBy(key, increment);
    if (newValue === increment) {
      await redisClient.expire(key, ttl);
    }
    return newValue;
  } catch (error) {
    logger.error('Redis incrCache error', { key, error: error.message });
    return null;
  }
};

// Gracefully close the Redis connection on app termination
const closeRedisConnection = async () => {
  try {
    await redisClient.quit();
    logger.info('🔌 Redis connection closed gracefully.');
  } catch (error) {
    logger.error('❌ Error closing Redis connection', { error: error.message });
  }
};

const invalidateCacheByPattern = async (pattern) => {
    let cursor = 0;
    const keysToDelete = [];
    try {
        logger.debug(`Starting SCAN to invalidate cache with pattern: ${pattern}`);
        do {
            const reply = await redisClient.scan(cursor, {
                MATCH: pattern,
                COUNT: 100 // Process 100 keys per iteration
            });
            cursor = reply.cursor;
            if (reply.keys.length > 0) {
                keysToDelete.push(...reply.keys);
            }
        } while (cursor !== 0);

        if (keysToDelete.length > 0) {
            await redisClient.del(keysToDelete);
            logger.info(`Invalidated ${keysToDelete.length} cache keys for pattern: ${pattern}`);
        } else {
            logger.debug(`No keys found to invalidate for pattern: ${pattern}`);
        }
    } catch (error) {
        logger.error('Redis invalidateCacheByPattern error', { pattern, error: error.message });
    }
};


module.exports = {
  redisClient,
  setCache,
  getCache,
  deleteCache,
  isTokenBlacklisted,
  blacklistToken,
  incrCache,
  closeRedisConnection, 
  invalidateCacheByPattern
};