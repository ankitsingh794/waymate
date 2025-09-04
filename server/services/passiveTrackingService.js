const Trip = require('../models/Trip');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');
const { getCache, setCache } = require('../config/redis');
const { identifyPlaceByCoordinates } = require('./finderService');
const AppError = require('../utils/AppError');

// --- Configuration (from environment variables with defaults) ---
const MIN_TRIP_DISTANCE_KM = parseInt(process.env.PASSIVE_MIN_TRIP_DISTANCE_KM, 10) || 5;
const STATIONARY_RADIUS_METERS = parseInt(process.env.PASSIVE_STATIONARY_RADIUS_METERS, 10) || 200;
const TRIP_END_IDLE_MINUTES = parseInt(process.env.PASSIVE_TRIP_END_IDLE_MINUTES, 10) || 30;
const USER_STATE_TTL_SECONDS = 24 * 60 * 60; // Keep user state in Redis for 24 hours

/**
 * Calculates the Haversine distance between two points on the Earth.
 * @returns {number} Distance in kilometers.
 */
const haversineDistance = (p1, p2) => {
    const R = 6371; // Radius of Earth in km
    const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
    const dLon = (p2.lon - p1.lon) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1.lat * (Math.PI / 180)) * Math.cos(p2.lat * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

/**
 * Infers the mode of transport based on the average and max speed of data points.
 */
const inferTransportMode = (dataPoints) => {
    let totalSpeed = 0;
    let maxSpeed = 0;
    dataPoints.forEach(p => {
        const speed = p.speed || 0; // Speed in m/s
        totalSpeed += speed;
        if (speed > maxSpeed) maxSpeed = speed;
    });
    const avgSpeedKmh = (totalSpeed / dataPoints.length) * 3.6;
    const maxSpeedKmh = maxSpeed * 3.6;

    if (maxSpeedKmh > 150 || avgSpeedKmh > 100) return 'train'; // Or flight
    if (maxSpeedKmh > 40 || avgSpeedKmh > 25) return 'car';
    if (avgSpeedKmh > 15) return 'bus';
    return 'walk';
};

const getUserState = async (userId) => {
    const state = await getCache(`tracking_state:${userId}`);
    return state || { status: 'IDLE', activeTripId: null, tripPoints: [], stationarySince: null, lastPoint: null };
};

const setUserState = async (userId, state) => {
    await setCache(`tracking_state:${userId}`, state, USER_STATE_TTL_SECONDS);
};

/**
 * [FIXED] When a user stops, this function identifies the place and adds it to the active trip.
 */
const classifyAndNudgeForStopPurpose = async (user, activeTripId, stationaryLocation) => {
    try {
        const trip = await Trip.findById(activeTripId);
        if (!trip) {
            logger.warn(`Could not find active trip ${activeTripId} to add a stop.`);
            return;
        }

        const primaryPlace = await identifyPlaceByCoordinates({
            lat: stationaryLocation.lat,
            lon: stationaryLocation.lon
        });

        if (!primaryPlace) {
            logger.info(`Could not identify a specific place for user ${user.email}'s stop.`);
            return;
        }

        const lastItineraryItem = trip.itinerary[trip.itinerary.length - 1];
        const newActivity = {
            sequence: (lastItineraryItem ? lastItineraryItem.sequence : 0) + 1,
            type: 'activity',
            description: `Stop at ${primaryPlace.name}`,
            startTime: new Date(),
            placeId: primaryPlace._id
        };
        
        trip.itinerary.push(newActivity);
        await trip.save();

        const message = `We noticed you've stopped at ${primaryPlace.name}. What is the purpose of this stop?`;
        notificationService.emitToUser(user._id.toString(), 'stopPurposeNudge', {
            message: message,
            tripId: trip._id,
            itineraryItemId: newActivity._id,
            options: ['shopping', 'dining', 'work', 'leisure', 'other']
        });
        logger.info(`Sent stop purpose nudge to user ${user.email} for place: ${primaryPlace.name}`);
    } catch (error) {
        logger.error('Failed to classify and nudge for stop purpose.', { error: error.message });
    }
};

/**
 * [FIXED] This function no longer creates a trip, but finalizes an existing one.
 */
const finalizeTrip = async (user, activeTripId, tripPoints) => {
    if (!activeTripId || tripPoints.length < 2) return;

    try {
        const trip = await Trip.findById(activeTripId);
        if (!trip) return;

        const startPoint = tripPoints[0];
        const endPoint = tripPoints[tripPoints.length - 1];
        const totalDistance = haversineDistance(startPoint, endPoint);

        if (totalDistance < MIN_TRIP_DISTANCE_KM) {
            logger.info(`Detected trip ${activeTripId} was less than minimum distance. Deleting.`);
            await Trip.findByIdAndDelete(activeTripId);
            return;
        }
        
        // Update the trip with final details
        trip.endDate = new Date(endPoint.timestamp);
        trip.status = 'unconfirmed'; // Ready for user confirmation
        await trip.save();

        logger.info(`Finalized unconfirmed trip ${trip._id} for user ${user.email}.`);
        const message = `It looks like you've completed a trip. Would you like to save and complete the details?`;
        notificationService.emitToUser(user._id.toString(), 'tripDetected', {
            message: message,
            tripId: trip._id
        });

    } catch (error) {
        logger.error('Failed to finalize draft trip.', { error: error.message, tripId: activeTripId });
    }
};

/**
 * [FIXED] Main state machine logic, now correctly integrated.
 */
const processAndDetectTrips = async (user, dataPoints) => {
    if (!dataPoints || dataPoints.length === 0) return;
    let state = await getUserState(user._id);

    for (const point of dataPoints) {
        if (!state.lastPoint) {
            state.lastPoint = point;
            continue;
        }

        const distanceMeters = haversineDistance(state.lastPoint, point) * 1000;
        
        switch (state.status) {
            case 'IDLE':
                if (distanceMeters > STATIONARY_RADIUS_METERS) {
                    logger.debug(`User ${user.email} started moving. Transitioning to MOVING.`);
                    state.status = 'MOVING';
                    state.tripPoints = [state.lastPoint, point];
                    // [FIX] Create the draft trip as soon as movement starts
                    const draftTrip = await Trip.create({
                        destination: `Trip started on ${new Date(point.timestamp).toLocaleDateString()}`,
                        startDate: new Date(point.timestamp),
                        endDate: new Date(point.timestamp), // Will be updated later
                        travelers: 1,
                        group: { members: [{ userId: user._id, role: 'owner' }] },
                        status: 'unconfirmed',
                        source: 'passive_detection',
                        itinerary: []
                    });
                    state.activeTripId = draftTrip._id;
                }
                break;

            case 'MOVING':
                if (distanceMeters < STATIONARY_RADIUS_METERS) {
                    logger.debug(`User ${user.email} has stopped. Transitioning to STATIONARY.`);
                    state.status = 'STATIONARY';
                    state.stationarySince = new Date(point.timestamp);
                    // [FIX] Nudge for stop purpose when movement ceases
                    if (state.activeTripId) {
                        classifyAndNudgeForStopPurpose(user, state.activeTripId, point);
                    }
                } else {
                    state.tripPoints.push(point);
                }
                break;

            case 'STATIONARY':
                if (distanceMeters > STATIONARY_RADIUS_METERS) {
                    logger.debug(`User ${user.email} started moving again. Resetting to MOVING.`);
                    state.status = 'MOVING';
                    state.stationarySince = null;
                } else {
                    const idleMinutes = (new Date(point.timestamp) - new Date(state.stationarySince)) / (1000 * 60);
                    if (idleMinutes > TRIP_END_IDLE_MINUTES) {
                        logger.debug(`User ${user.email} has been idle long enough to end the trip.`);
                        await finalizeTrip(user, state.activeTripId, state.tripPoints);
                        state = { status: 'IDLE', activeTripId: null, tripPoints: [], stationarySince: null, lastPoint: null }; // Reset state
                    }
                }
                break;
        }
        state.lastPoint = point;
    }
    await setUserState(user._id, state);
};

module.exports = { processAndDetectTrips };

