/**
 * Sends a standardized success response.
 * @param {object} res - Express response object.
 * @param {number} statusCode - HTTP status code.
 * @param {string} message - Success message.
 * @param {object} [data={}] - Data payload.
 */
const sendSuccess = (res, statusCode, message, data = {}) => {
  const response = {
    success: true,
    statusCode,
    message,
  };
  if (Object.keys(data).length > 0) {
    response.data = data;
  }
  return res.status(statusCode).json(response);
};

/**
 * Sends a standardized error response.
 * This should be called from your centralized error handler.
 * @param {object} res - Express response object.
 * @param {number} statusCode - HTTP status code.
 * @param {string} message - Error message.
 */
const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
};

/**
 * Sends a response with tokens, setting the refresh token in a secure, httpOnly cookie.
 * @param {object} res - Express response object.
 * @param {number} statusCode - HTTP status code.
 * @param {string} message - Success message.
 * @param {object} tokens - Object containing accessToken and refreshToken.
 * @param {object} [userData={}] - Additional user data to send in the response.
 */
const sendTokenResponse = (res, statusCode, message, tokens, userData = {}) => {
  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_REFRESH_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
  };

  res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data: {
      accessToken: tokens.accessToken,
      user: userData, 
    },
  });
};


module.exports = {
  sendSuccess,
  sendError,
  sendTokenResponse,
  
};