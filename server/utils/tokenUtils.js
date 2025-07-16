const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Generate Access Token (Short-lived)
 * @param {String} id - User ID
 * @returns {String} JWT Access Token
 */
exports.generateAccessToken = (id) => {
  try {
    const token = jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m' // Default 15 min
    });
    logger.debug(`Access token generated for userId: ${id}`);
    return token;
  } catch (error) {
    logger.error(`Error generating Access Token: ${error.message}`);
    throw error;
  }
};

/**
 * Generate Refresh Token (Long-lived)
 * @param {String} id - User ID
 * @returns {String} JWT Refresh Token
 */
exports.generateRefreshToken = (id) => {
  try {
    const token = jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' // Default 7 days
    });
    logger.debug(`Refresh token generated for userId: ${id}`);
    return token;
  } catch (error) {
    logger.error(`Error generating Refresh Token: ${error.message}`);
    throw error;
  }
};

/**
 * Verify Token
 * @param {String} token - JWT Token
 * @param {Boolean} isRefresh - true for refresh token, false for access token
 * @returns {Object} Decoded payload
 */
exports.verifyToken = (token, isRefresh = false) => {
  try {
    const secret = isRefresh ? process.env.JWT_REFRESH_SECRET : process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    logger.debug(`Token verified successfully`, { userId: decoded.id, type: isRefresh ? 'refresh' : 'access' });
    return decoded;
  } catch (error) {
    logger.warn(`Token verification failed: ${error.message}`);
    throw error;
  }
};
