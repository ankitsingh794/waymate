const User = require('../models/User');
const logger = require('../utils/logger');
const cloudinary = require('../config/cloudinary');

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
exports.getUserProfile = async (req, res, next) => {
  try {
    logger.info(`Fetching profile for user: ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: 'User profile fetched successfully',
      data: req.user
    });
  } catch (error) {
    logger.error(`Error fetching profile: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
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

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    logger.error(`Error updating profile: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update user avatar
 * @route   PUT /api/users/profile/avatar
 * @access  Private
 */
exports.updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      logger.warn(`No avatar file provided by user: ${req.user.email}`);
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    // ✅ Upload to Cloudinary
    const result = await cloudinary.uploader.upload_stream(
      {
        folder: 'waymate/avatars',
        resource_type: 'image',
        transformation: [{ width: 300, height: 300, crop: 'fill' }]
      },
      async (error, uploadResult) => {
        if (error) {
          logger.error(`Cloudinary upload failed: ${error.message}`);
          return next(error);
        }

        // ✅ Update user avatar URL in DB
        const user = await User.findByIdAndUpdate(
          req.user._id,
          { avatar: uploadResult.secure_url },
          { new: true, runValidators: true }
        ).select('-password');

        logger.info(`Avatar updated for user: ${req.user.email}`);

        res.status(200).json({
          success: true,
          message: 'Avatar updated successfully',
          data: { avatar: user.avatar }
        });
      }
    );

    // ✅ Write the file buffer to the upload stream
    result.end(req.file.buffer);
  } catch (error) {
    logger.error(`Error updating avatar: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Change user account status (Admin only)
 * @route   PUT /api/users/:id/status
 * @access  Admin
 */
exports.changeAccountStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'banned'].includes(status)) {
      logger.warn(`Invalid account status provided: ${status}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid account status'
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { accountStatus: status },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      logger.warn(`User not found for status change: ID ${id}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info(`Account status changed for user: ${user.email} → ${status}`);

    res.status(200).json({
      success: true,
      message: `Account status updated to ${status}`,
      data: user
    });
  } catch (error) {
    logger.error(`Error changing account status: ${error.message}`);
    next(error);
  }
};
