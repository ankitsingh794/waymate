const cron = require('node-cron');
const axios = require('axios');
const Trip = require('../models/Trip');
const tripService = require('./tripService'); // Assuming getRouteData will be exported from here
const notificationService =require('./notificationService');
const logger = require('../utils/logger');
const { getCache, setCache } = require('../config/redis'); // Using Redis for caching
const { GOOGLE_GEOCODING_BASE, GOOGLE_API_KEY } = require('../config/apiConfig');

const MONITORING_INTERVAL_MINUTES = 5;
const ALERT_THRESHOLD_MINUTES = 15; // Trigger alert if you'll be more than 15 mins late

/**
 * Parses a time string (e.g., "2:00 PM", "14:00") from an activity description.
 * @param {string} activityText - The text of the activity.
 * @returns {Date|null} A Date object for today with the parsed time, or null if no time is found.
 */
function parseActivityTime(activityText) {
    const match = activityText.match(/(?:at|by|for)\s*(\d{1,2}:\d{2})\s*([AP]M)?/i);
    if (!match) return null;

    const timeString = match[1];
    const period = match[2]?.toUpperCase();
    let [hours, minutes] = timeString.split(':').map(Number);

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const activityTime = new Date();
    activityTime.setHours(hours, minutes, 0, 0);
    return activityTime;
}

/**
 * Converts an activity name into GPS coordinates using the Geocoding API, with Redis caching.
 * @param {string} activityName - The name of the place from the itinerary.
 * @param {string} destinationCity - The city the trip is in, for context.
 * @returns {Promise<object|null>} The coordinates { lat, lon } or null.
 */
async function geocodeActivity(activityName, destinationCity) {
    const activityQuery = activityName.split('(')[0].trim();
    const cacheKey = `geocode:${destinationCity}:${activityQuery}`.replace(/\s+/g, '_').toLowerCase();
    const cachedCoords = await getCache(cacheKey);
    if (cachedCoords) {
        logger.debug(`Geocode cache hit for: ${activityQuery}`);
        return cachedCoords;
    }

    logger.debug(`Geocode cache miss. Fetching from API for: ${activityQuery}`);
    try {
        const response = await axios.get(GOOGLE_GEOCODING_BASE, {
            params: { address: `${activityQuery}, ${destinationCity}`, key: GOOGLE_API_KEY }
        });
        const location = response.data.results[0]?.geometry?.location;
        if (location) {
            const coords = { lat: location.lat, lon: location.lng };
            // Cache successful lookups for a week to drastically reduce API calls.
            await setCache(cacheKey, coords, 604800); // 7 days
            return coords;
        }
        return null;
    } catch (error) {
        logger.error(`Failed to geocode activity "${activityQuery}":`, error.message);
        return null;
    }
}

/**
 * A background job that proactively monitors ongoing trips for potential delays.
 */
const monitorOngoingTrips = async () => {
    logger.info(`Running scheduled job: Monitoring ongoing trips for delays...`);
    try {
        const now = new Date();
        const ongoingTrips = await Trip.find({
            status: 'ongoing',
            startDate: { $lte: now },
            endDate: { $gte: now },
            'itinerary.0': { $exists: true }
        }).populate('group.members.userId', 'location.point email');

        if (ongoingTrips.length === 0) return;

        // This prevents checking the same route multiple times if users are in the same location.
        const routeCache = new Map();

        for (const trip of ongoingTrips) {
            const currentDayOfTrip = Math.ceil((now - new Date(trip.startDate)) / (1000 * 60 * 60 * 24));
            const todaysItinerary = trip.itinerary.find(day => day.day === currentDayOfTrip);
            if (!todaysItinerary) continue;

            for (const activity of todaysItinerary.activities) {
                const activityTime = parseActivityTime(activity);
                if (!activityTime || activityTime <= now) continue;

                const minutesUntilActivity = (activityTime.getTime() - now.getTime()) / (1000 * 60);

                // Only check activities that are approaching (e.g., within the next 2 hours).
                if (minutesUntilActivity > 0 && minutesUntilActivity < 120) {
                    const activityLocation = await geocodeActivity(activity, trip.destination);
                    if (!activityLocation) continue;

                    for (const member of trip.group.members) {
                        const user = member.userId;
                        if (!user?.location?.point?.coordinates?.length) continue;

                        const userCoords = { lat: user.location.point.coordinates[1], lon: user.location.point.coordinates[0] };
                        const routeKey = `${userCoords.lat.toFixed(4)},${userCoords.lon.toFixed(4)}:${activityLocation.lat.toFixed(4)},${activityLocation.lon.toFixed(4)}`;

                        let travelInfo;
                        if (routeCache.has(routeKey)) {
                            travelInfo = routeCache.get(routeKey);
                        } else {
                            travelInfo = await tripService.getRouteData(userCoords, activityLocation);
                            routeCache.set(routeKey, travelInfo); // Cache the result for this run.
                        }

                        const estimatedTravelMinutes = (travelInfo?.fastest?.durationValue || 0) / 60;

                        if (estimatedTravelMinutes > (minutesUntilActivity + ALERT_THRESHOLD_MINUTES)) {
                            const alertMessage = `❗ Heads up! Traffic to "${activity.split('(')[0].trim()}" is heavy. It may take you ${travelInfo.fastest.duration} to get there. You might want to leave soon to make it on time.`;
                            notificationService.emitToUser(user._id, 'proactiveTravelAlert', { tripId: trip._id, message: alertMessage });
                            logger.info(`Sent proactive delay alert to ${user.email} for trip ${trip._id}`);
                        }
                    }
                }
            }
        }
    } catch (error) {
        logger.error('Error during live itinerary monitoring:', { error: error.message, stack: error.stack });
    }
};

/**
 * Initializes the scheduled job for monitoring live itineraries.
 */
const initLiveItineraryService = () => {
    cron.schedule(`*/${MONITORING_INTERVAL_MINUTES} * * * *`, monitorOngoingTrips);
    logger.info(`✅ Live itinerary monitoring initialized. Job will run every ${MONITORING_INTERVAL_MINUTES} minutes.`);
};

module.exports = { initLiveItineraryService };