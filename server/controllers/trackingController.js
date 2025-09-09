const trackingService = require('../services/passiveTrackingService');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { isValidObjectId } = require('mongoose');

exports.startTrip = async (req, res) => {
    const { startPoint } = req.body;
    if (!startPoint || !startPoint.latitude || !startPoint.longitude) {
        return sendError(res, 400, 'A valid "startPoint" must be provided.');
    }
    try {
        const trip = await trackingService.handleTripStart(req.user, startPoint);
        sendSuccess(res, 201, 'Trip started successfully.', { tripId: trip._id });
    } catch (error) {
        console.error('Error starting trip:', error);
        sendError(res, 500, 'Could not start trip.');
    }
};


exports.confirmTripStart = async (req, res) => {
    try {
        const trip = await trackingService.handleConfirmTripStart(req.user.id, req.body.tripId);
        sendSuccess(res, 200, 'Trip confirmed.', { tripId: trip._id });
    } catch (error) { sendError(res, error.statusCode || 500, error.message); }
};

exports.cancelTripStart = async (req, res) => {
    try {
        await trackingService.handleCancelTripStart(req.user.id, req.body.tripId);
        sendSuccess(res, 200, 'Trip cancelled.');
    } catch (error) { sendError(res, error.statusCode || 500, error.message); }
};

exports.changeTripMode = async (req, res) => {
    try {
        await trackingService.handleChangeTripMode(req.user.id, req.body.tripId, req.body.newMode);
        sendSuccess(res, 200, 'Trip mode updated.');
    } catch (error) { sendError(res, error.statusCode || 500, error.message); }
};

exports.appendDataToTrip = async (req, res) => {
    const { tripId, batch } = req.body;
    if (!isValidObjectId(tripId)) {
        return sendError(res, 400, 'A valid "tripId" must be provided.');
    }
    if (!batch || !Array.isArray(batch) || batch.length === 0) {
        return sendError(res, 400, 'Request must include a non-empty "batch" array.');
    }
    try {
        await trackingService.handleTripDataAppend(req.user.id, tripId, batch);
        sendSuccess(res, 200, 'Data appended successfully.');
    } catch (error) {
        sendError(res, error.statusCode || 500, error.message);
    }
};

exports.endTrip = async (req, res) => {
    const { tripId, endPoint } = req.body;
    if (!isValidObjectId(tripId)) {
        return sendError(res, 400, 'A valid "tripId" must be provided.');
    }
    // Asynchronously process the finalization
    sendSuccess(res, 202, 'Trip end signal received. Final processing initiated.');
    try {
        // No await here, let it run in the background
        trackingService.handleTripEnd(req.user, tripId, endPoint);
    } catch (error) {
        // Since we already sent a success response, we just log the error
        console.error(`Error during background trip finalization for trip ${tripId}:`, error);
    }
};

exports.confirmOrCorrectTripMode = async (req, res) => {
    const { tripId } = req.params;
    const { correctedMode } = req.body;
    const userId = req.user.id;

    if (!isValidObjectId(tripId)) {
        return sendError(res, 400, 'Invalid Trip ID format.');
    }
    if (!correctedMode) {
        return sendError(res, 400, 'A "correctedMode" must be provided.');
    }
    try {
        const updatedTrip = await trackingService.handleUserCorrection(userId, tripId, correctedMode);
        sendSuccess(res, 200, 'Trip mode confirmed successfully.', { trip: updatedTrip });
    } catch (error) {
        sendError(res, error.statusCode || 500, error.message);
    }
};
