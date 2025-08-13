const finderService = require('../services/finderService');
const { sendError, sendSuccess } = require('../utils/responseHelper');
const logger = require('../utils/logger');

exports.findPlaces = async (req, res) => {
    const { query, location, lat, lon } = req.query;

    if (!query) {
        return sendError(res, 400, 'A search query is required.');
    }

    const searchLocation = location || req.user.location?.city || 'current';
    const userCoords = (lat && lon) ? { lat: parseFloat(lat), lon: parseFloat(lon) } : null;

    try {
        const places = await finderService.findPlaces(query, searchLocation, userCoords);
        logger.info(`Finder service returned ${places.length} places for query: "${query}"`);

        return sendSuccess(res, 200, 'Places found successfully.', places);
        
    } catch (error) {
        logger.error(`Error in findPlaces controller: ${error.message}`);
        return sendError(res, 500, 'Failed to find places.');
    }
};