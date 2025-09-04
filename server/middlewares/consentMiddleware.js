const ConsentLog = require('../models/ConsentLog');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Middleware to check if a user has granted a specific type of consent.
 * @param {string} consentType - The type of consent to check for (e.g., 'data_collection').
 */
exports.requireConsent = (consentType) => async (req, res, next) => {
    try {
        const lastConsent = await ConsentLog.findOne({
            userId: req.user._id,
            consentType: consentType,
        }).sort({ createdAt: -1 });

        if (lastConsent && lastConsent.status === 'granted') {
            return next();
        }

        logger.warn(`Consent check failed for user ${req.user.email}. Required: '${consentType}'.`);
        return next(new AppError(`You must provide consent for ${consentType.replace('_', ' ')} to use this feature.`, 403)); // 403 Forbidden

    } catch (error) {
        next(error);
    }
};