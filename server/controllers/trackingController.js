const passiveTrackingService = require('../services/passiveTrackingService');
const { sendSuccess } = require('../utils/responseHelper');

/**
 * @desc    Processes a batch of tracking data from a user's device
 * @route   POST /api/v1/tracking/data
 * @access  Private
 */
exports.processDataBatch = async (req, res, next) => {
    const { dataPoints } = req.body; // Expecting an array of location data
    const user = req.user;

    // Don't wait for the processing to finish, respond immediately
    // This is a "fire-and-forget" endpoint
    sendSuccess(res, 202, 'Data batch accepted for processing.');

    // Process the data in the background
    passiveTrackingService.processAndDetectTrips(user, dataPoints);
};