const { invalidateCacheByPattern } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Invalidates all caches related to a specific trip.
 * This includes details, settlements, AI itineraries, etc.
 * @param {string} tripId The ID of the trip.
 */
const invalidateTripCache = async (tripId) => {
    if (!tripId) return;
    const pattern = `trip:${tripId}:*`;
    logger.info(`Invalidating all cache entries for trip pattern: ${pattern}`);
    await invalidateCacheByPattern(pattern);
};

/**
 * Invalidates all caches related to a specific user.
 * This is primarily for their lists of trips.
 * @param {string} userId The ID of the user.
 */
const invalidateUserCache = async (userId) => {
    if (!userId) return;
    const pattern = `user:${userId}:*`;
    logger.info(`Invalidating all cache entries for user pattern: ${pattern}`);
    await invalidateCacheByPattern(pattern);
};

module.exports = {
    invalidateTripCache,
    invalidateUserCache,
};