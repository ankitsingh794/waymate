const Trip = require('../models/Trip');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');
const transportationClassifier = require('./transportationClassifier');

const MIN_TRIP_DISTANCE_KM = parseInt(process.env.PASSIVE_MIN_TRIP_DISTANCE_KM, 10) || 0.5; // 500 meters

const haversineDistance = (p1, p2) => {
    if (!p1?.latitude || !p1?.longitude || !p2?.latitude || !p2?.longitude) return 0;
    const R = 6371; // Radius of Earth in km
    const dLat = (p2.latitude - p1.latitude) * (Math.PI / 180);
    const dLon = (p2.longitude - p1.longitude) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1.latitude * (Math.PI / 180)) * Math.cos(p2.latitude * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

/**
 * Creates a new trip record when the client signals a trip has started.
 */
exports.handleTripStart = async (user, startPoint) => {
    logger.info(`Starting new trip for user ${user.email} from client signal.`);
    return Trip.create({
        destination: `Trip on ${new Date(startPoint.timestamp).toLocaleDateString()}`,
        startDate: new Date(startPoint.timestamp),
        group: { members: [{ userId: user._id, role: 'owner' }] },
        status: 'in_progress',
        source: 'passive_detection_v2_ml',
        rawDataPoints: [startPoint]
    });
};

/**
 * Appends new data points to an in-progress trip.
 */
exports.handleTripDataAppend = async (userId, tripId, dataBatch) => {
    const trip = await Trip.findOne({ _id: tripId, 'group.members.userId': userId, status: 'in_progress' });
    if (!trip) {
        const error = new Error('Active trip not found or permission denied.');
        error.statusCode = 404;
        throw error;
    }
    await Trip.updateOne({ _id: tripId }, { $push: { rawDataPoints: { $each: dataBatch } } });
};

/**
 * Finalizes a trip when the client signals it has ended.
 */
exports.handleTripEnd = async (user, tripId, endPoint) => {
    logger.info(`Finalizing trip ${tripId} for user ${user.email}`);
    const trip = await Trip.findById(tripId);
    if (!trip || trip.status !== 'in_progress') {
        logger.warn(`Trip ${tripId} not found or was already finalized.`);
        return;
    }

    const allPoints = [...trip.rawDataPoints, ...(endPoint ? [endPoint] : [])];
    if (allPoints.length < 2) {
        await Trip.findByIdAndDelete(tripId);
        logger.info(`Deleted trip ${tripId} due to insufficient data.`);
        return;
    }

    const startPoint = allPoints[0];
    const finalPoint = allPoints[allPoints.length - 1];

    if (haversineDistance(startPoint, finalPoint) < MIN_TRIP_DISTANCE_KM) {
        await Trip.findByIdAndDelete(tripId);
        logger.info(`Deleted trip ${tripId} as it did not meet the minimum distance.`);
        return;
    }

    const classification = await transportationClassifier.classifyTrip(allPoints);

    trip.endDate = new Date(finalPoint.timestamp);
    trip.status = 'unconfirmed';
    trip.detectedMode = classification.mode;
    trip.confidence = classification.confidence;
    trip.path = { type: 'LineString', coordinates: allPoints.map(p => [p.longitude, p.latitude]) };
    trip.isConfirmed = false;
    trip.rawDataPoints = allPoints;

    await trip.save();
    logger.info(`Finalized trip ${trip._id} with mode: ${classification.mode}`);

    const message = `It looks like you completed a trip by ${classification.mode}. Please confirm the details.`;
    notificationService.emitToUser(user._id.toString(), 'tripDetected', { message, tripId: trip._id });
};

/**
 * Handles a user's manual correction or confirmation of a trip's mode.
 */
exports.handleUserCorrection = async (userId, tripId, correctedMode) => {
    const trip = await Trip.findOne({ _id: tripId, 'group.members.userId': userId });
    if (!trip) {
        const error = new Error('Trip not found or you do not have permission to edit it.');
        error.statusCode = 404;
        throw error;
    }
    trip.isConfirmed = true;
    trip.confirmedMode = correctedMode;
    // Only retrain if the mode was different from the detected one
    if (trip.detectedMode !== correctedMode) {
        transportationClassifier.triggerRetraining(trip, correctedMode);
    }
    await trip.save();
    return trip;
};


exports.handleConfirmTripStart = async (userId, tripId) => {
    const trip = await Trip.findOneAndUpdate(
        { _id: tripId, 'group.members.userId': userId, status: 'pending_confirmation' },
        { $set: { status: 'in_progress' } },
        { new: true }
    );
    if (!trip) throw new Error('Trip to confirm not found.');
    return trip;
};

exports.handleCancelTripStart = async (userId, tripId) => {
    const trip = await Trip.findOneAndUpdate(
        { _id: tripId, 'group.members.userId': userId, status: 'pending_confirmation' },
        { $set: { status: 'cancelled' } }
    );
    if (!trip) throw new Error('Trip to cancel not found.');
};

exports.handleChangeTripMode = async (userId, tripId, newMode) => {
    const trip = await Trip.findOne({ _id: tripId, 'group.members.userId': userId, status: 'in_progress' });
    if (!trip) throw new Error('Active trip not found for mode change.');

    // End the last segment
    const lastSegment = trip.segments[trip.segments.length - 1];
    lastSegment.endTime = new Date();

    // Add the new segment
    trip.segments.push({
        mode: newMode,
        startTime: new Date(),
        rawDataPoints: [] // Starts empty, will be filled by subsequent /append calls
    });

    await trip.save();
};

