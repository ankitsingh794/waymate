const User = require('../models/User');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/responseHelper');
const cloudinary = require('../config/cloudinary');

/**
 * @desc Get current user profile
 * @route GET /api/users/profile
 * @access Private
 */
exports.getUserProfile = async (req, res, next) => {
  try {
    logger.info(`Fetching profile for user: ${req.user.email}`);
    return sendSuccess(res, 200, true, 'User profile fetched successfully', { user: req.user });
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
        const updateData = {};
        if (name) updateData.name = name;
        if (preferences) {
            if (preferences.language) updateData['preferences.language'] = preferences.language;
            if (preferences.currency) updateData['preferences.currency'] = preferences.currency;
        }
        if (location) {
            if (location.city) updateData['location.city'] = location.city;
            if (location.country) updateData['location.country'] = location.country;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        logger.info(`User profile updated for: ${req.user.email}`);
        return sendSuccess(res, 200, true, 'Profile updated successfully', { user: updatedUser });
    } catch (error) {
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
        if (req.params.id === req.user.id) {
            return next(new AppError('Admins cannot change their own account status.', 400));
        }

        const user = await User.findByIdAndUpdate(
            req.params.id, 
            { accountStatus: req.body.status },
            { new: true, runValidators: true }
        ).select('name email role accountStatus');

        if (!user) {
            return next(new AppError('User not found with that ID.', 404));
        }

        logger.info(`Account status for ${user.email} changed to '${req.body.status}' by admin ${req.user.email}`);
        return sendSuccess(res, 200, true, `Account status updated to ${req.body.status}`, { user });
    } catch (error) {
        next(error);
    }
};


exports.updateUserPhoto = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new AppError('No image file provided for upload.', 400));
        }

        const user = await User.findById(req.user._id);

        const uploadResponse = await cloudinary.uploader.upload_stream(
            { folder: `avatars`, public_id: user._id, overwrite: true, format: 'webp' },
            async (error, result) => {
                if (error) {
                    logger.error('Cloudinary upload failed:', error);
                    return next(new AppError('Image could not be uploaded.', 500));
                }
                
                user.profileImage = result.secure_url;
                await user.save({ validateBeforeSave: false }); 

                logger.info(`Profile photo updated for user: ${user.email}`);
                sendSuccess(res, 200, true, 'Profile photo updated successfully.', { profileImage: user.profileImage });
            }
        ).end(req.file.buffer);

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update the current user's live location.
 * @route   PATCH /api/users/profile/location
 * @access  Private
 */
exports.updateUserLocation = async (req, res, next) => {
    const { lat, lon } = req.body;

    if (typeof lat !== 'number' || typeof lon !== 'number') {
        return next(new AppError('Invalid coordinates provided. Latitude and longitude must be numbers.', 400));
    }

    try {
        await User.findByIdAndUpdate(req.user._id, {
            $set: {
                'location.point': {
                    type: 'Point',
                    coordinates: [lon, lat] 
                }
            }
        });
        
        // Use sendSuccess from your responseHelper for a consistent response
        sendSuccess(res, 200, 'Location updated successfully.');

    } catch (error) {
        logger.error(`Error updating location for user ${req.user.email}:`, { error: error.message });
        // Pass the error to the global error handler
        next(new AppError('Failed to update location.', 500));
    }
};