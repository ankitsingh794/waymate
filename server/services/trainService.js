const axios = require('axios');
const { getCache, setCache } = require('../config/redis');
const logger = require('../utils/logger');
const aiService = require('./aiService');
const prompts = require('../config/promptLibrary');
const { filterTrainsWithSeats } = require('./seatAvailabilityService'); 

const { IRCTC_API_KEY, IRCTC_API_HOST = 'irctc1.p.rapidapi.com' } = process.env;

if (!IRCTC_API_KEY) {
    logger.warn('IRCTC_API_KEY not set. Live train data will be unavailable.');
}

/**
 * Fetches live train data from the IRCTC API and caches it.
 */
async function fetchLiveTrainData(fromStationCode, toStationCode, date) {
    if (!IRCTC_API_KEY) return [];
    const cacheKey = `live-trains:${fromStationCode}:${toStationCode}:${date}`;
    const cached = await getCache(cacheKey);
    if (cached) {
        logger.info(`Serving live train data from cache for ${fromStationCode} → ${toStationCode}`);
        return cached;
    }

    try {
        const response = await axios.get(`https://${IRCTC_API_HOST}/api/v1/searchTrain`, {
            params: { from: fromStationCode, to: toStationCode, date },
            headers: { 'X-RapidAPI-Key': IRCTC_API_KEY, 'X-RapidAPI-Host': IRCTC_API_HOST },
            timeout: 8000
        });
        const trainData = response.data?.data || [];
        await setCache(cacheKey, trainData, 172800); // Cache for 48 hours
        return trainData;
    } catch (error) {
        logger.error('IRCTC API request failed', { message: error.message });
        return [];
    }
}

/**
 * Fetches trains for a station pair and filters them for seat availability.
 */
async function findAvailableTrainsForPair(fromStationCode, toStationCode, date) {
    const allTrains = await fetchLiveTrainData(fromStationCode, toStationCode, date);
    if (!allTrains || allTrains.length === 0) {
        return [];
    }
    return await filterTrainsWithSeats(allTrains, date);
}

/**
 * Get AI-powered recommendations from a list of available trains.
 */
async function getAiRecommendationsForTrains(trainList) {
    if (!trainList || trainList.length === 0) return [];
    try {
        const prompt = prompts.generateTrainRecommendationsPrompt(trainList);
        const recommendations = await aiService.getTrainRecommendations(prompt);
        return (recommendations?.length > 0) ? recommendations : trainList.slice(0, 5);
    } catch (error) {
        logger.error('AI recommendation generation failed', { message: error.message });
        return trainList.slice(0, 5);
    }
}

module.exports = {
    findAvailableTrainsForPair,
    getAiRecommendationsForTrains,
};