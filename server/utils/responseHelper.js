/**
 * Unified response helper
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {boolean} success - Success status
 * @param {string} message - Message for the client
 * @param {object} data - Optional data payload
 */
const sendResponse = (res, statusCode, success, message, data = {}) => {
  return res.status(statusCode).json({
    success,
    statusCode,
    message,
    ...(Object.keys(data).length > 0 && { data })
  });
};

module.exports = { sendResponse };
