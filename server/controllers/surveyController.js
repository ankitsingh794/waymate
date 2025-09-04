const SocioEconomicSurvey = require('../models/SocioEconomicSurvey');
const { sendSuccess } = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * @desc    Get the current user's socio-economic survey data
 * @route   GET /api/v1/surveys
 * @access  Private
 */
exports.getMySurveyData = async (req, res, next) => {
    try {
        // Find the survey data linked to the authenticated user's ID
        const surveyData = await SocioEconomicSurvey.findOne({ userId: req.user._id });

        // If no survey exists, return a default empty object.
        // This is a good practice as it allows the client-side to easily
        // determine if it needs to render a new survey form.
        if (!surveyData) {
            return sendSuccess(res, 200, 'No survey data found for user.', { survey: {} });
        }

        sendSuccess(res, 200, 'Survey data fetched successfully.', { survey: surveyData });
    } catch (error) {
        // Pass any errors to the central error handling middleware
        next(error);
    }
};

/**
 * @desc    Submit or update the current user's socio-economic survey data
 * @route   POST /api/v1/surveys
 * @access  Private
 */
exports.submitOrUpdateSurveyData = async (req, res, next) => {
    try {
        const { householdIncome, vehicleCount, primaryTransportModeToWork } = req.body;

        // Use findOneAndUpdate with 'upsert: true' to either create a new survey
        // if one doesn't exist, or update the existing one. This is an efficient
        // way to handle both creation and update operations in a single database call.
        const surveyData = await SocioEconomicSurvey.findOneAndUpdate(
            { userId: req.user._id }, // The query to find the document
            { 
                $set: { // The fields to update or set
                    householdIncome,
                    vehicleCount,
                    primaryTransportModeToWork,
                    lastUpdated: new Date()
                }
            },
            { 
                new: true,           // Option to return the modified document instead of the original
                upsert: true,        // Create the document if it doesn't exist
                runValidators: true  // Ensure the update operation respects schema validations
            }
        );

        logger.info(`Socio-economic survey data updated for user ${req.user.email}`);
        sendSuccess(res, 200, 'Survey data saved successfully.', { survey: surveyData });

    } catch (error) {
        next(error);
    }
};
