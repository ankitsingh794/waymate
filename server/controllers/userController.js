const User = require('../models/User');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/responseHelper');
const cloudinary = require('../config/cloudinary');
const ConsentLog = require('../models/ConsentLog');

/**
 * @desc Get current user profile
 * @route GET /api/users/profile
 * @access Private
 */
exports.getUserProfile = async (req, res, next) => {
  try {
    logger.info(`Fetching profile for user: ${req.user.email}`);
    // Consistent success response signature
    return sendSuccess(res, 200, true, 'User profile fetched successfully', { user: req.user });
  } catch (error) {
    logger.error(`Error fetching profile: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Update user profile details (name, preferences, location text)
 * @route PATCH /api/users/profile
 * @access Private
 */
exports.updateUserProfile = async (req, res, next) => {
    try {
        const { name, preferences, location } = req.body;
        const updateData = {};
        
        // Use flat notation for updating nested document fields in MongoDB
        if (name) updateData.name = name;
        if (preferences?.language) updateData['preferences.language'] = preferences.language;
        if (preferences?.currency) updateData['preferences.currency'] = preferences.currency;
        if (location?.city) updateData['location.city'] = location.city;
        if (location?.country) updateData['location.country'] = location.country;

        // Ensure at least one field is being updated
        if (Object.keys(updateData).length === 0) {
            return next(new AppError('No update data provided.', 400));
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
 * @desc Update user profile photo
 * @route PATCH /api/users/profile/photo
 * @access Private
 */
exports.updateUserPhoto = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new AppError('No image file provided for upload.', 400));
        }

        let user = await User.findById(req.user._id);
        if (!user) {
            return next(new AppError('User not found.', 404));
        }

        // Use a Promise to handle the stream-based upload from Cloudinary
        const uploadPromise = new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { 
                    folder: `avatars`, 
                    public_id: user._id.toString(), 
                    overwrite: true, 
                    format: 'webp', // Convert image to a modern format
                    transformation: [{ width: 250, height: 250, crop: 'fill', gravity: 'face' }] // Resize and crop
                },
                (error, result) => {
                    if (error) {
                        logger.error('Cloudinary upload failed:', error);
                        return reject(new AppError('Image could not be uploaded.', 500));
                    }
                    resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        const uploadResult = await uploadPromise;
        
        user.profileImage = uploadResult.secure_url;
        await user.save({ validateBeforeSave: false }); 

        const updatedUser = user.toObject();
        delete updatedUser.password;

        logger.info(`Profile photo updated for user: ${user.email}`);
        // Return the entire updated user object for consistency
        sendSuccess(res, 200, true, 'Profile photo updated successfully.', { user: updatedUser });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc Update the current user's live geo-location.
 * @route PATCH /api/users/profile/location
 * @access Private
 */
exports.updateUserLocation = async (req, res, next) => {
    try {
        const { lat, lon } = req.body;

        if (typeof lat !== 'number' || typeof lon !== 'number') {
            return next(new AppError('Invalid coordinates provided. Latitude and longitude must be numbers.', 400));
        }

        await User.findByIdAndUpdate(req.user._id, {
            $set: {
                'location.point': {
                    type: 'Point',
                    coordinates: [lon, lat] // GeoJSON format: [longitude, latitude]
                }
            }
        }, { new: true, runValidators: true });
        
        logger.info(`Location updated for user ${req.user.email}`);
        sendSuccess(res, 200, true, 'Location updated successfully.');
    } catch (error) {
        logger.error(`Error updating location for user ${req.user.email}:`, { error: error.message });
        next(new AppError('Failed to update location.', 500));
    }
};


/**
 * @desc Change a user's account status (Admin only)
 * @route PATCH /api/users/:id/status
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
        ).select('-password');

        if (!user) {
            return next(new AppError('User not found with that ID.', 404));
        }

        logger.info(`Account status for ${user.email} changed to '${req.body.status}' by admin ${req.user.email}`);
        return sendSuccess(res, 200, true, `Account status updated to ${req.body.status}`, { user });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc Record or update user consent status
 * @route POST /api/users/profile/consent
 * @access Private
 */
exports.updateUserConsent = async (req, res, next) => {
    try {
        const { consentType, status } = req.body; // status is 'granted' or 'revoked'
        const userId = req.user._id;

        await ConsentLog.create({
            userId,
            consentType,
            status,
            source: 'user_dashboard'
        });

        logger.info(`Consent status for '${consentType}' updated to '${status}' for user ${req.user.email}`);
        sendSuccess(res, 200, true, 'Consent status updated successfully.');
    } catch (error) {
        next(error);
    }
};
