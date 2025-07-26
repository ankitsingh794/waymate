const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const logger = require('../utils/logger');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/tokenUtils');
const { blacklistToken, isTokenBlacklisted } = require('../config/redis');
const { generateVerificationEmailHTML, generatePasswordResetEmailHTML } = require('../utils/emailTemplates');
const { sendResponse } = require('../utils/responseHelper');


// Set refresh token in HTTP-only cookie
const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * @desc    Register a new user with email verification link
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.registerUser = async (req, res, next) => {
  const { name, email, password } = req.body;
  logger.info('Register request received', { email });

  try {
    let user = await User.findOne({ email });
    if (user) {
      if (!user.isEmailVerified) {
        const verificationToken = user.createEmailVerifyToken();
        await user.save({ validateBeforeSave: false });
        const verifyURL = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

        await sendEmail({
          to: user.email,
          subject: `🚀 Welcome to WayMate! Please Verify Your Email`,
          html: generateVerificationEmailHTML(user.name, verifyURL)
        });

        return sendResponse(res, 200, true, 'Account already exists. A new verification email has been sent.');
      }
      return sendResponse(res, 400, false, 'User with this email already exists.');
    }

    user = new User({ name, email, password, isEmailVerified: false });
    const verificationToken = user.createEmailVerifyToken();
    await user.save();

    const verifyURL = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: user.email,
      subject: `🚀 Welcome to WayMate! Please Verify Your Email`,
      html: generateVerificationEmailHTML(user.name, verifyURL)
    });

    logger.info('User partially registered. Verification email sent.', { email });
    sendResponse(res, 201, true, 'Registration successful. Please check your email to verify your account.');

  } catch (error) {
    logger.error('Error in registerUser', { error: error.message });
    next(error);
  }
};

/**
 * @desc    Verify email using token from link
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
exports.verifyEmail = async (req, res, next) => {
  const { token } = req.body;
  if (!token) return sendResponse(res, 400, false, 'Verification token is required.');

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      logger.warn('Email verification failed: Invalid or expired token.');
      return sendResponse(res, 400, false, 'Invalid or expired verification token.');
    }

    user.isEmailVerified = true;
    user.accountStatus = 'active';
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save();

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    setRefreshTokenCookie(res, refreshToken);

    logger.info('Email verified successfully and user logged in.', { email: user.email });
    sendResponse(res, 200, true, 'Email verified successfully. You are now logged in.', {
      accessToken,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    logger.error('Error in verifyEmail', { error: error.message });
    next(error);
  }
};

/**
 * @desc    Forgot Password - Send reset link
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  logger.info('Forgot password request received', { email });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Forgot password attempt for non-existent user: ${email}`);
      return sendResponse(res, 200, true, 'If an account with that email exists, a password reset link has been sent.');
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: '🔑 Your WayMate Password Reset Request',
      html: generatePasswordResetEmailHTML(user.name, resetURL)
    });

    sendResponse(res, 200, true, 'If an account with that email exists, a password reset link has been sent.');
  } catch (error) {
    const user = await User.findOne({ email });
    if (user) {
      user.passwordResetToken = undefined;
      user.passwordResetTokenExpires = undefined;
      await user.save({ validateBeforeSave: false });
    }
    logger.error('Error in forgotPassword', { error: error.message });
    next(error);
  }
};

/**
 * @desc    Reset Password using token from link
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
exports.resetPassword = async (req, res, next) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return sendResponse(res, 400, false, 'Token and new password are required.');
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      logger.warn('Password reset failed: Invalid or expired token.');
      return sendResponse(res, 400, false, 'Invalid or expired password reset token.');
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    user.passwordChangedAt = Date.now();
    await user.save();

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    setRefreshTokenCookie(res, refreshToken);

    logger.info('Password has been reset successfully.', { email: user.email });
    sendResponse(res, 200, true, 'Password reset successfully. You are now logged in.', {
      accessToken,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    logger.error('Error in resetPassword', { error: error.message });
    next(error);
  }
};


/**
 * @desc Login user
 * @route POST /api/auth/login
 * @access Public
 */
exports.loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  logger.info('Login attempt', { email, ip: req.ip });

  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return sendResponse(res, 401, false, 'Invalid credentials');
    }

    // FIX: Email verification is now properly enforced. The bypass has been removed.
    if (!user.isEmailVerified) {
      return sendResponse(res, 403, false, 'Please verify your email before logging in.');
    }

    if (user.accountStatus !== 'active') {
      return sendResponse(res, 403, false, `Your account is ${user.accountStatus}. Please contact support.`);
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return sendResponse(res, 401, false, 'Invalid credentials');
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    setRefreshTokenCookie(res, refreshToken);

    logger.info('Login successful', { email, userId: user._id });
    sendResponse(res, 200, true, 'Login successful', {
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    logger.error('Error in loginUser', { error: error.message });
    next(error);
  }
};


/**
 * @desc Logout user (Blacklist access & refresh tokens)
 * @route POST /api/auth/logout
 * @access Private
 */

exports.logoutUser = async (req, res, next) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    const refreshToken = req.cookies.refreshToken;
    const currentTime = Math.floor(Date.now() / 1000);

    if (accessToken) {
      const decodedAccess = jwt.decode(accessToken);
      if (decodedAccess?.exp) {
        const accessTTL = decodedAccess.exp - currentTime;
        if (accessTTL > 0) {
          await blacklistToken(`bl_access_${accessToken}`, 'true', accessTTL);
        }
      }
    }

    if (refreshToken) {
      const decodedRefresh = jwt.decode(refreshToken);
      if (decodedRefresh?.exp) {
        const refreshTTL = decodedRefresh.exp - currentTime;
        if (refreshTTL > 0) {
          await blacklistToken(`bl_refresh_${refreshToken}`, 'true', refreshTTL);
        }
      }
    }

    res.clearCookie('refreshToken');
    sendResponse(res, 200, true, 'Logged out successfully');

  } catch (error) {
    logger.error('Error in logoutUser', { error: error.message });
    next(error);
  }
};
/**
 * @desc Refresh access token
 * @route POST /api/auth/refresh-token
 * @access Public (with refresh token cookie)
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      logger.warn('Refresh token missing');
      return sendResponse(res, 401, false, 'Refresh token missing');
    }

    // ✅ Check if refresh token is blacklisted
    const blacklisted = await isTokenBlacklisted(refreshToken);
    if (blacklisted) {
      logger.warn('Blacklisted refresh token used');
      return sendResponse(res, 401, false, 'Invalid or expired refresh token');
    }

    // ✅ Verify refresh token
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      logger.warn('Invalid refresh token');
      return sendResponse(res, 401, false, 'Invalid refresh token');
    }

    // ✅ Check user existence
    const user = await User.findById(decoded.id);
    if (!user) {
      logger.warn('Refresh token failed - user not found');
      return sendResponse(res, 404, false, 'User not found');
    }

    // ✅ Generate new access token
    const newAccessToken = generateAccessToken(user._id);

    logger.info('Access token refreshed', { userId: user._id });
    return sendResponse(res, 200, true, 'Access token refreshed', {
      accessToken: newAccessToken
    });
  } catch (error) {
    logger.error('Error in refreshToken', { error: error.message });
    next(error);
  }
};



/**
 * @desc Update password for logged-in user
 * @route PUT /api/auth/update-password
 * @access Private
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    const { currentPassword, newPassword } = req.body;

    logger.info('Password update request', { userId: req.user.id });

    if (!user) {
      logger.warn('Password update failed - user not found', { userId: req.user.id });
      return sendResponse(res, 404, false, 'User not found');
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      logger.warn('Password update failed - incorrect current password', { userId: req.user.id });
      return sendResponse(res, 400, false, 'Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();
    logger.info('Password updated successfully', { userId: req.user.id });
    return sendResponse(res, 200, true, 'Password updated successfully');
  } catch (error) {
    logger.error('Error in updatePassword', { error: error.message, userId: req.user.id });
    next(error);
  }
};

