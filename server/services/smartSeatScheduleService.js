const logger = require('../utils/logger');
const { getCache, setCache } = require('../config/redis');
const { findAvailableTrainsForPair, getAiRecommendationsForTrains } = require('./trainService');
const stationMapper = require('../utils/stationMapper');

const CACHE_TTL_SECONDS = 172800; // 48h cache for quota safety

/**
 * Orchestrates finding the best train options between two geographic coordinates.
 * @param {object} originCoords { lat, lon }
 * @param {object} destinationCoords { lat, lon }
 * @param {string} date YYYY-MM-DD
 */
async function getSmartSeatSchedule(originCoords, destinationCoords, date) {
    const cacheKey = `smart-seat-schedule-v2:${originCoords.lat.toFixed(3)}:${originCoords.lon.toFixed(3)}:${destinationCoords.lat.toFixed(3)}:${destinationCoords.lon.toFixed(3)}:${date}`;
    const cached = await getCache(cacheKey);
    if (cached) {
        logger.info('Serving Smart Seat Schedule from cache');
        return cached;
    }

    // 1. Find nearest stations for both origin and destination
    const [originStations, destinationStations] = await Promise.all([
        stationMapper.nearestStations(originCoords.lat, originCoords.lon, { limit: 2 }),
        stationMapper.nearestStations(destinationCoords.lat, destinationCoords.lon, { limit: 2 })
    ]);

    if (!originStations.length || !destinationStations.length) {
        return { error: 'No nearby train stations found for one or both locations.' };
    }

    // 2. Create all possible station pairs to check
    const stationPairs = [];
    for (const origin of originStations) {
        for (const destination of destinationStations) {
            stationPairs.push({ from: origin, to: destination });
        }
    }

    // 3. Find all available trains for all pairs IN PARALLEL for maximum efficiency
    const promises = stationPairs.map(pair => 
        findAvailableTrainsForPair(pair.from.code, pair.to.code, date)
    );
    const results = await Promise.all(promises);
    const allAvailableTrains = results.flat(); // Flatten the array of arrays

    if (allAvailableTrains.length === 0) {
        return { error: 'No trains with available seats were found between any nearby stations for the selected date.' };
    }

    // 4. Get AI recommendations from the complete list of available trains
    const recommendedOptions = await getAiRecommendationsForTrains(allAvailableTrains);
    
    // 5. Construct the final schedule object
    const finalSchedule = {
        sourceStation: recommendedOptions[0]?.from_station_name || originStations[0].name,
        destinationStation: recommendedOptions[0]?.to_station_name || destinationStations[0].name,
        travelDate: date,
        options: recommendedOptions,
        lastUpdated: new Date().toISOString()
    };
    
    await setCache(cacheKey, finalSchedule, CACHE_TTL_SECONDS);
    return finalSchedule;
}

module.exports = { getSmartSeatSchedule };