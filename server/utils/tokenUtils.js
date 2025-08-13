const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('./logger');

/**
 * Generates a short-lived JWT Access Token.
 * Includes a unique token identifier (jti) for blacklisting.
 * @param {string} userId - The user's MongoDB ObjectId.
 * @returns {string} The JWT Access Token.
 */
const generateAccessToken = (userId) => {
  try {
    const jti = crypto.randomBytes(16).toString('hex');
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m',
      jwtid: jti,
    });
    logger.debug(`Generated access token for user: ${userId}`);
    return token;
  } catch (error) {
    logger.error('Error generating access token:', { error: error.message });
    throw new Error('Could not create access token.');
  }
};

/**
 * Generates a long-lived JWT Refresh Token.
 * @param {string} userId - The user's MongoDB ObjectId.
 * @returns {string} The JWT Refresh Token.
 */
const generateRefreshToken = (userId) => {
  try {
    const jti = crypto.randomBytes(16).toString('hex');
    const token = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
      jwtid: jti,
    });
    logger.debug(`Generated refresh token for user: ${userId}`);
    return token;
  } catch (error) {
    logger.error('Error generating refresh token:', { error: error.message });
    throw new Error('Could not create refresh token.');
  }
};

/**
 * Verifies a JWT and returns its decoded payload.
 * @param {string} token - The JWT to verify.
 * @param {'access' | 'refresh'} tokenType - The type of token being verified.
 * @returns {object | null} The decoded payload if valid, otherwise null.
 */
const verifyToken = (token, tokenType = 'access') => {
  try {
    const secret = tokenType === 'refresh' 
      ? process.env.JWT_REFRESH_SECRET 
      : process.env.JWT_SECRET;
    return jwt.verify(token, secret);
  } catch (error) {
    logger.warn(`Token verification failed: ${error.message}`);
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
};