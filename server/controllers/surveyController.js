// controllers/surveyController.js

const SocioEconomicSurvey = require('../models/SocioEconomicSurvey');
const { sendSuccess } = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * @desc    Get the current user's socio-economic survey data
 * @route   GET /api/v1/surveys/my-data
 * @access  Private
 */
exports.getMySurveyData = async (req, res, next) => {
    try {
        const surveyData = await SocioEconomicSurvey.findOne({ userId: req.user._id });

        // If no survey exists, return `null` data.
        // This is a clear, unambiguous signal to the client.
        if (!surveyData) {
            return sendSuccess(res, 200, 'No survey data found for this user.', { data: null });
        }

        // IMPORTANT: The response key is now 'data' to align with the Flutter client's expectation.
        sendSuccess(res, 200, 'Survey data fetched successfully.', { data: surveyData });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Submit or update the current user's socio-economic survey data
 * @route   POST /api/v1/surveys/my-data
 * @access  Private
 */
exports.submitOrUpdateSurveyData = async (req, res, next) => {
    try {
        const { householdIncome, vehicleCount, primaryTransportModeToWork } = req.body;

        // Using findOneAndUpdate with 'upsert: true' efficiently handles both creation and updates.
        const surveyData = await SocioEconomicSurvey.findOneAndUpdate(
            { userId: req.user._id },
            { 
                // The $set operator updates specified fields.
                // The manual `lastUpdated` field is removed as `timestamps: true` handles it automatically.
                $set: { 
                    householdIncome,
                    vehicleCount,
                    primaryTransportModeToWork,
                }
            },
            { 
                new: true,           // Return the modified document
                upsert: true,        // Create if it doesn't exist
                runValidators: true  // Run schema validations
            }
        );

        logger.info(`Socio-economic survey data updated for user ${req.user.email}`);
        
        // IMPORTANT: The response key is now 'data' for consistency.
        sendSuccess(res, 200, 'Survey data saved successfully.', { data: surveyData });

    } catch (error) {
        next(error);
    }
};