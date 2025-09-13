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
 * New logic: Collects all data → ML prediction → Check accuracy threshold → User nudging if needed
 */
exports.handleTripEnd = async (user, tripId, endPoint) => {
    logger.info(`Finalizing trip ${tripId} for user ${user.email}`);
    const trip = await Trip.findById(tripId);
    if (!trip || trip.status !== 'in_progress') {
        logger.warn(`Trip ${tripId} not found or was already finalized.`);
        return;
    }

    // Step 1: Collect all required data points
    const allPoints = [...trip.rawDataPoints, ...(endPoint ? [endPoint] : [])];
    if (allPoints.length < 2) {
        await Trip.findByIdAndDelete(tripId);
        logger.info(`Deleted trip ${tripId} due to insufficient data.`);
        return;
    }

    const startPoint = allPoints[0];
    const finalPoint = allPoints[allPoints.length - 1];

    // Minimum distance validation
    if (haversineDistance(startPoint, finalPoint) < MIN_TRIP_DISTANCE_KM) {
        await Trip.findByIdAndDelete(tripId);
        logger.info(`Deleted trip ${tripId} as it did not meet the minimum distance.`);
        return;
    }

    // Step 2: Send all data to ML model for prediction
    logger.info(`Sending trip data to ML model for classification...`);
    const classification = await transportationClassifier.classifyTrip(allPoints);
    
    // Ensure we have both mode and accuracy from ML response
    const mlMode = classification.mode || 'unknown';
    const mlAccuracy = (classification.confidence || classification.accuracy || 0) * 100; // Convert to percentage

    // Step 3: Check accuracy threshold (70%)
    const ACCURACY_THRESHOLD = 70;
    
    if (mlAccuracy >= ACCURACY_THRESHOLD) {
        // High confidence: Directly populate in DB as confirmed
        logger.info(`High accuracy (${mlAccuracy}%) - Auto-confirming trip as ${mlMode}`);
        
        trip.endDate = new Date(finalPoint.timestamp);
        trip.status = 'completed';
        trip.detectedMode = mlMode;
        trip.confirmedMode = mlMode;
        trip.confidence = mlAccuracy / 100; // Store as decimal
        trip.isConfirmed = true;
        trip.path = { type: 'LineString', coordinates: allPoints.map(p => [p.longitude, p.latitude]) };
        trip.rawDataPoints = allPoints;

        // Update new ML prediction fields
        trip.mlPrediction = {
            detectedMode: mlMode,
            accuracy: mlAccuracy / 100,
            confidence: mlAccuracy / 100,
            requiresUserConfirmation: false,
            autoConfirmed: true,
            confirmationRequested: null,
            userConfirmedAt: new Date()
        };

        // Mark as passively detected
        trip.passiveData = {
            ...trip.passiveData,
            detectedMode: mlMode,
            confirmedMode: mlMode,
            modeConfidence: mlAccuracy / 100,
            isPassivelyDetected: true
        };

        await trip.save();
        logger.info(`Auto-confirmed trip ${trip._id} with mode: ${mlMode} (${mlAccuracy}% accuracy)`);

        // Notify user of completed trip
        await notificationService.sendTripCompletedNotification(user._id.toString(), {
            tripId: trip._id,
            mode: mlMode,
            accuracy: mlAccuracy / 100
        });

    } else {
        // Low confidence: Set as unconfirmed and nudge user
        logger.info(`Low accuracy (${mlAccuracy}%) - Requesting user confirmation for trip ${tripId}`);
        
        trip.endDate = new Date(finalPoint.timestamp);
        trip.status = 'unconfirmed';
        trip.detectedMode = mlMode;
        trip.confidence = mlAccuracy / 100; // Store as decimal
        trip.isConfirmed = false;
        trip.path = { type: 'LineString', coordinates: allPoints.map(p => [p.longitude, p.latitude]) };
        trip.rawDataPoints = allPoints;

        // Update new ML prediction fields
        trip.mlPrediction = {
            detectedMode: mlMode,
            accuracy: mlAccuracy / 100,
            confidence: mlAccuracy / 100,
            requiresUserConfirmation: true,
            autoConfirmed: false,
            confirmationRequested: new Date(),
            userConfirmedAt: null
        };

        // Mark as passively detected but unconfirmed
        trip.passiveData = {
            ...trip.passiveData,
            detectedMode: mlMode,
            modeConfidence: mlAccuracy / 100,
            isPassivelyDetected: true
        };

        await trip.save();
        logger.info(`Trip ${trip._id} requires user confirmation - ML accuracy: ${mlAccuracy}%`);

        // Step 4: Nudge user for confirmation
        await notificationService.sendTripConfirmationRequest(user._id.toString(), {
            tripId: trip._id,
            detectedMode: mlMode,
            accuracy: mlAccuracy / 100
        });
    }
};

/**
 * Handles a user's manual correction or confirmation of a trip's mode.
 * Updates the database with confirmed mode and ML feedback.
 */
exports.handleUserCorrection = async (userId, tripId, correctedMode) => {
    const trip = await Trip.findOne({ _id: tripId, 'group.members.userId': userId });
    if (!trip) {
        const error = new Error('Trip not found or you do not have permission to edit it.');
        error.statusCode = 404;
        throw error;
    }

    // Update trip confirmation status
    trip.isConfirmed = true;
    trip.confirmedMode = correctedMode;
    trip.status = 'completed'; // Mark as completed after user confirmation

    // Update ML prediction fields
    if (trip.mlPrediction) {
        trip.mlPrediction.requiresUserConfirmation = false;
        trip.mlPrediction.userConfirmedAt = new Date();
        
        // Log if user corrected the ML prediction
        if (trip.mlPrediction.detectedMode !== correctedMode) {
            logger.info(`User corrected ML prediction from ${trip.mlPrediction.detectedMode} to ${correctedMode} for trip ${tripId}`);
        }
    }

    // Update passive data
    if (trip.passiveData) {
        trip.passiveData.confirmedMode = correctedMode;
    }

    // Trigger ML model retraining if the mode was different from detected
    if (trip.detectedMode !== correctedMode) {
        logger.info(`Triggering ML retraining: detected=${trip.detectedMode}, corrected=${correctedMode}`);
        transportationClassifier.triggerRetraining(trip, correctedMode);
    }

    await trip.save();
    logger.info(`Trip ${tripId} confirmed by user as ${correctedMode}`);

    // Notify user of successful confirmation
    notificationService.emitToUser(userId.toString(), 'tripConfirmed', {
        message: `Trip confirmed as ${correctedMode} travel. Thank you for your feedback!`,
        tripId: trip._id,
        confirmedMode: correctedMode
    });

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

