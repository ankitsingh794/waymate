const axios = require('axios');
const logger = require('../utils/logger');
const { getCache, setCache } = require('../config/redis');

const {
  IRCTC_API_KEY,
  IRCTC_API_HOST = 'irctc1.p.rapidapi.com'
} = process.env;

if (!IRCTC_API_KEY) {
  logger.warn('IRCTC_API_KEY not set. Seat availability checks will not work.');
}

/**
 * Checks seat availability for a single train class and caches the result.
 * This is the lowest-level function for checking a specific seat type.
 * @param {string} trainNo Train number
 * @param {string} fromStationCode Source station code
 * @param {string} toStationCode Destination station code
 * @param {string} date Travel date in 'YYYY-MM-DD'
 * @param {string} travelClass Seat class to check (e.g., '3A')
 * @param {string} quota Seat quota (e.g., 'GN')
 * @returns {Promise<boolean>} True if seats are available, false otherwise.
 */
async function checkSeatAvailability(trainNo, fromStationCode, toStationCode, date, travelClass = 'SL', quota = 'GN') {
    const cacheKey = `seat-v2:${trainNo}:${fromStationCode}:${toStationCode}:${date}:${travelClass}:${quota}`;
    const cached = await getCache(cacheKey);
    if (cached !== null) {
        return cached === 'true'; 
    }

    try {
        const response = await axios.get(`https://${IRCTC_API_HOST}/api/v1/checkSeat`, {
            params: { trainNo, from: fromStationCode, to: toStationCode, date, classType: travelClass, quota },
            headers: {
                'X-RapidAPI-Key': IRCTC_API_KEY,
                'X-RapidAPI-Host': IRCTC_API_HOST
            },
            timeout: 8000
        });

        const isAvailable = response.data?.data?.some(seat => seat.status && !seat.status.toUpperCase().includes('WL'));
        await setCache(cacheKey, isAvailable ? 'true' : 'false', 172800); 
        return !!isAvailable;

    } catch (err) {
        logger.error(`Seat availability check failed for ${trainNo} (${travelClass})`, { message: err.message });
        await setCache(cacheKey, 'false', 3600); 
        return false;
    }
}

/**
 * Checks availability for multiple seat classes on a single train.
 * @param {string} trainNo
 * @param {string} fromStationCode
 * @param {string} toStationCode
 * @param {string} date
 * @param {string[]} [classesToCheck=['1A', '2A', '3A', 'SL']] - Array of classes to check.
 * @returns {Promise<Array<object>>} An array of objects for available classes, e.g., [{ class: '3A', available: true }].
 */
async function checkMultipleClasses(trainNo, fromStationCode, toStationCode, date, classesToCheck = ['1A', '2A', '3A', 'SL']) {
  const availabilityChecks = classesToCheck.map(travelClass =>
    checkSeatAvailability(trainNo, fromStationCode, toStationCode, date, travelClass)
      .then(isAvailable => ({ class: travelClass, available: isAvailable }))
  );

  const availabilityResults = await Promise.all(availabilityChecks);
  return availabilityResults.filter(result => result.available);
}

/**
 * Efficiently filters a list of trains to find those with available seats.
 * This is the primary function to be used by other services.
 * @param {Array<object>} trains - An array of train objects.
 * @param {string} date - The date of travel in 'YYYY-MM-DD' format.
 * @returns {Promise<Array<object>>} A new array of trains that have available seats,
 * enhanced with an 'availableClasses' property.
 */
async function filterTrainsWithSeats(trains, date) {
    if (!trains || trains.length === 0) {
        return [];
    }
    logger.info(`Filtering ${trains.length} trains for seat availability on ${date}.`);
    const trainCheckPromises = trains.map(async (train) => {
        const availableClasses = await checkMultipleClasses(
            train.train_number,
            train.from_station_code,
            train.to_station_code,
            date
        );
        if (availableClasses.length > 0) {
            return {
                ...train,
                availableClasses: availableClasses.map(ac => ac.class), 
            };
        }
        return null; 
    });

    const results = await Promise.all(trainCheckPromises);

    const trainsWithSeats = results.filter(train => train !== null);

    logger.info(`Found ${trainsWithSeats.length} trains with available seats.`);
    return trainsWithSeats;
}

module.exports = {
  checkSeatAvailability,
  checkMultipleClasses,
  filterTrainsWithSeats,
};