const User = require('../models/User');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/responseHelper');
const cloudinary = require('../config/cloudinary');
const ConsentLog = require('../models/ConsentLog');
const crypto = require('crypto');

/**
 * @desc Get current user profile
 * @route GET /api/users/profile
 * @access Private
 */
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Sync consents from ConsentLog
    await user.syncConsentsFromLog();
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
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
        return sendSuccess(res, 200, 'Profile updated successfully', { user: updatedUser });
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
        sendSuccess(res, 200,'Profile photo updated successfully.', { user: updatedUser });

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
        sendSuccess(res, 200, 'Location updated successfully.');
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
        return sendSuccess(res, 200,`Account status updated to ${req.body.status}`, { user });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update user consent
 * @route   PUT /api/v1/users/consent
 * @access  Private
 */
exports.updateUserConsent = async (req, res, next) => {
  try {
    const { consentType, status } = req.body;
    
    // Validate input
    const validConsentTypes = ['data_collection', 'demographic_data', 'passive_tracking'];
    const validStatuses = ['granted', 'revoked'];
    
    if (!validConsentTypes.includes(consentType)) {
      return next(new AppError('Invalid consent type', 400));
    }
    
    if (!validStatuses.includes(status)) {
      return next(new AppError('Invalid consent status', 400));
    }

    // Create consent log entry
    await ConsentLog.create({
      userId: req.user._id,
      consentType,
      status,
      source: 'mobile_app'
    });

    // Update user's consent field
    const user = await User.findById(req.user._id);
    user.consents[consentType] = {
      status,
      updatedAt: new Date()
    };
    await user.save();

    logger.info(`User consent updated: ${req.user.email} - ${consentType}: ${status}`);

    res.json({
      success: true,
      message: 'Consent updated successfully',
      data: {
        consentType,
        status,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users (for researchers/admins)
 * @route   GET /api/v1/users
 * @access  Researcher/Admin only
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    
    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const users = await User.find(query)
      .select('name email accountStatus createdAt demographics location.city location.country')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .lean();

    // Get total count for pagination
    const total = await User.countDocuments(query);

    // Create anonymized hashes for research purposes
    const usersWithHashes = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      demographics: user.demographics,
      location: {
        city: user.location?.city,
        country: user.location?.country
      },
      // Add anonymized hash for analytics
      anonymizedHash: createAnonymousHash(user._id.toString())
    }));

    res.json({
      success: true,
      data: {
        users: usersWithHashes,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

    logger.info(`User list requested by: ${req.user.email}`);
  } catch (error) {
    next(error);
  }
};

// Helper function for creating anonymous hashes (add this to the file)
const createAnonymousHash = (id) => {
  const ANONYMIZATION_SALT = process.env.ANONYMIZATION_SALT || 'waymate-analytics-salt';
  return crypto.createHmac('sha256', ANONYMIZATION_SALT)
    .update(id.toString())
    .digest('hex')
    .substring(0, 16);
};
