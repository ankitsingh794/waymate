const User = require('../models/User');
const logger = require('../utils/logger');
const { sendResponse } = require('../utils/responseHelper'); // ✅ Standardized response

/**
 * @desc Get current user profile
 * @route GET /api/users/profile
 * @access Private
 */
exports.getUserProfile = async (req, res, next) => {
  try {
    logger.info(`Fetching profile for user: ${req.user.email}`);
    return sendResponse(res, 200, true, 'User profile fetched successfully', { user: req.user });
  } catch (error) {
    logger.error(`Error fetching profile: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
exports.updateUserProfile = async (req, res, next) => {
  try {
    const { name, preferences, location } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        ...(name && { name }),
        ...(preferences && { preferences }),
        ...(location && { location })
      },
      { new: true, runValidators: true }
    ).select('-password');

    logger.info(`User profile updated: ${req.user.email}`);
    return sendResponse(res, 200, true, 'Profile updated successfully', { user: updatedUser });
  } catch (error) {
    logger.error(`Error updating profile: ${error.message}`);
    next(error);
  }
  
};


/**
 * @desc Change user account status (Admin only)
 * @route PUT /api/users/:id/status
 * @access Admin
 */
exports.changeAccountStatus = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      logger.warn(`Unauthorized status change attempt by user: ${req.user.email}`);
      return sendResponse(res, 403, false, 'Access denied. Admins only.');
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'banned'].includes(status)) {
      logger.warn(`Invalid account status provided: ${status}`);
      return sendResponse(res, 400, false, 'Invalid account status');
    }

    const user = await User.findByIdAndUpdate(id, { accountStatus: status }, { new: true, runValidators: true })
      .select('-password');

    if (!user) {
      logger.warn(`User not found for status change: ID ${id}`);
      return sendResponse(res, 404, false, 'User not found');
    }

    logger.info(`Account status changed for user: ${user.email} → ${status}`);
    return sendResponse(res, 200, true, `Account status updated to ${status}`, { user });
  } catch (error) {
    logger.error(`Error changing account status: ${error.message}`);
    next(error);
  }
};
