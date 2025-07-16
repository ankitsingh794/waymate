const User = require('../models/User');
const Otp = require('../models/Otp');
const sendEmail = require('../utils/sendEmail');
const logger = require('../utils/logger');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');

// ✅ Unified response helper
const sendResponse = (res, statusCode, success, message, data = {}) => {
  return res.status(statusCode).json({ success, message, data });
};

/**
 * Set refresh token in HTTP-only cookie
 */
const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only over HTTPS in production
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};
/**
 * @desc Register new user
 * @route POST /api/auth/register
 * @access Public
 */
exports.registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    logger.info('Register request received', { email, ip: req.ip });

    const userExists = await User.findOne({ email });
    if (userExists) {
      logger.warn('Registration failed - user exists', { email });
      return sendResponse(res, 400, false, 'User already exists');
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'user',            // ✅ Default role
      accountStatus: 'active'  // ✅ Default status
    });

    // ✅ Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // ✅ Set refresh token in HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    logger.info('User registered successfully', { email, userId: user._id });
    return sendResponse(res, 201, true, 'User registered successfully', {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus
      }
    });
  } catch (error) {
    logger.error('Error in registerUser', { error: error.message });
    next(error);
  }
};

/**
 * @desc Login user
 * @route POST /api/auth/login
 * @access Public
 */
exports.loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    logger.info('Login attempt', { email, ip: req.ip });

    // ✅ Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      logger.warn('Login failed - user not found', { email });
      return sendResponse(res, 400, false, 'Invalid credentials');
    }

    // ✅ Check account status
    if (user.accountStatus === 'suspended') {
      logger.warn('Login blocked - account suspended', { email });
      return sendResponse(res, 403, false, 'Your account is suspended. Contact support.');
    }

    if (user.accountStatus === 'banned') {
      logger.warn('Login blocked - account banned', { email });
      return sendResponse(res, 403, false, 'Your account has been banned. Contact support.');
    }

    // ✅ Validate password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      logger.warn('Login failed - invalid password', { email });
      return sendResponse(res, 400, false, 'Invalid credentials');
    }

    // ✅ Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // ✅ Set refresh token in HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    logger.info('Login successful', { email, userId: user._id });
    return sendResponse(res, 200, true, 'Login successful', {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus
      }
    });
  } catch (error) {
    logger.error('Error in loginUser', { error: error.message });
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

    const decoded = require('../utils/tokenUtils').verifyToken(refreshToken, true);
    if (!decoded) {
      logger.warn('Invalid refresh token');
      return sendResponse(res, 401, false, 'Invalid refresh token');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      logger.warn('Refresh token failed - user not found');
      return sendResponse(res, 404, false, 'User not found');
    }

    const newAccessToken = generateAccessToken(user._id);
    logger.info('Access token refreshed', { userId: user._id });

    return sendResponse(res, 200, true, 'Access token refreshed', { accessToken: newAccessToken });
  } catch (error) {
    logger.error('Error in refreshToken', { error: error.message });
    next(error);
  }
};

/**
 * @desc Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
exports.logoutUser = async (req, res, next) => {
  try {
    res.clearCookie('refreshToken');
    logger.info('User logged out', { userId: req.user.id });
    return sendResponse(res, 200, true, 'Logged out successfully');
  } catch (error) {
    logger.error('Error in logoutUser', { error: error.message });
    next(error);
  }
};

/**
 * @desc Send OTP to email
 * @route POST /api/auth/send-otp
 * @access Public
 */
exports.sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    logger.info('OTP request received', { email });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 mins
    });

    await sendEmail({
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP is ${otp}. It expires in 10 minutes.`
    });

    logger.info('OTP sent successfully', { email });
    return sendResponse(res, 200, true, 'OTP sent to email');
  } catch (error) {
    logger.error('Error in sendOtp', { error: error.message, email: req.body.email });
    next(error);
  }
};

/**
 * @desc Verify OTP
 * @route POST /api/auth/verify-otp
 * @access Public
 */
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    logger.info('OTP verification attempt', { email });

    const otpDoc = await Otp.findOne({ email }).sort({ createdAt: -1 });
    if (!otpDoc) {
      logger.warn('OTP verification failed - no OTP found', { email });
      return sendResponse(res, 400, false, 'OTP not found');
    }

    const isMatch = await otpDoc.matchOtp(otp);
    if (!isMatch) {
      logger.warn('OTP verification failed - invalid OTP', { email });
      return sendResponse(res, 400, false, 'Invalid OTP');
    }

    if (otpDoc.expiresAt < Date.now()) {
      logger.warn('OTP verification failed - OTP expired', { email });
      return sendResponse(res, 400, false, 'OTP expired');
    }

    await Otp.deleteMany({ email });
    logger.info('OTP verified successfully', { email });
    return sendResponse(res, 200, true, 'OTP verified');
  } catch (error) {
    logger.error('Error in verifyOtp', { error: error.message, email: req.body.email });
    next(error);
  }
};

/**
 * @desc Reset password using OTP
 * @route POST /api/auth/reset-password
 * @access Public
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    logger.info('Password reset attempt', { email });

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn('Password reset failed - user not found', { email });
      return sendResponse(res, 400, false, 'User not found');
    }

    user.password = newPassword;
    await user.save();
    logger.info('Password reset successful', { email });
    return sendResponse(res, 200, true, 'Password updated successfully');
  } catch (error) {
    logger.error('Error in resetPassword', { error: error.message, email: req.body.email });
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

/**
 * @desc Get current user profile
 * @route GET /api/auth/me
 * @access Private
 */
exports.getCurrentUser = async (req, res, next) => {
  try {
    logger.info('Fetching user profile', { userId: req.user.id });
    const user = await User.findById(req.user.id);
    return sendResponse(res, 200, true, 'User profile fetched successfully', { user });
  } catch (error) {
    logger.error('Error in getCurrentUser', { error: error.message, userId: req.user.id });
    next(error);
  }
};


