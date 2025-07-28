const finderService = require('../services/finderService');
const { sendResponse } = require('../utils/responseHelper');
const logger = require('../utils/logger');

exports.findPlaces = async (req, res) => {
    const { query, location } = req.query;

    if (!query) {
        return sendResponse(res, 400, false, 'A search query is required.');
    }

    const searchLocation = location || req.user.location?.city || 'Jamshedpur';

    try {
        const places = await finderService.findPlaces(query, searchLocation, req.user.location);
        logger.info(`Finder service returned ${places.length} places for query: "${query}"`);
        return sendResponse(res, 200, true, 'Places found successfully.', { places });
    } catch (error) {
        logger.error(`Error in findPlaces controller: ${error.message}`);
        return sendResponse(res, 500, false, 'Failed to find places.');
    }
};