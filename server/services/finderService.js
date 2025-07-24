const axios = require('axios');
const logger = require('../utils/logger');
const { getFilteredResponse } = require('./aiService');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

/**
 * Finds and ranks places based on a natural language query and location.
 * @param {string} query The user's natural language query.
 * @param {string|object} location The city/area to search in (string) or coordinates (object).
 * @param {string} date_context The time context for the search.
 * @returns {Array} A ranked list of recommended places.
 */
async function findPlaces(query, location, date_context) {
    if (!GOOGLE_API_KEY) {
        logger.error('GOOGLE_API_KEY is not configured for the finder service.');
        throw new Error('This feature is currently unavailable.');
    }

    let candidatePlaces = [];
    try {
        let response;
        if (typeof location === 'object' && location.lat && location.lon) {
            // If we have coordinates, perform a "Nearby Search"
            logger.info(`Performing Nearby Search for "${query}" at coords.`);
            response = await axios.get(`${GOOGLE_PLACES_BASE}/nearbysearch/json`, {
                params: {
                    location: `${location.lat},${location.lon}`,
                    radius: 5000, // Search within a 5km radius
                    keyword: query, // Use keyword for the user's query
                    key: GOOGLE_API_KEY,
                }
            });
        } else {
            // If we have a location name, perform a "Text Search"
            logger.info(`Performing Text Search for "${query}" in "${location}".`);
            response = await axios.get(`${GOOGLE_PLACES_BASE}/textsearch/json`, {
                params: {
                    query: `${query} in ${location}`,
                    key: GOOGLE_API_KEY,
                }
            });
        }

        candidatePlaces = response.data.results || [];
    } catch (error) {
        logger.error('Google Places API call failed in finderService:', error.message);
        throw new Error('Could not fetch places data.');
    }

    if (candidatePlaces.length === 0) {
        return [];
    }

    // --- (The rest of the function for AI filtering remains the same) ---
    const filteringPrompt = `
        You are a discerning and helpful local guide. A user is looking for: "${query}".
        CRITICAL CONTEXT: They want to go on or during: "${date_context || 'any time'}".
        Based on the provided data, return a ranked list of the top 3 matches.
        For each match, provide a brief, one-sentence "reason" explaining why it's a good fit.
        Your response MUST be a single, valid JSON array of objects with keys: "name", "address", "rating", and "reason".
        ### Candidate Places Data:
        ${JSON.stringify(candidatePlaces.slice(0, 15), null, 2)}
    `;
    
    try {
        const rankedResults = await getFilteredResponse(filteringPrompt);
        return rankedResults;
    } catch (error) {
        logger.error('AI filtering failed in finderService:', error.message);
        // Fallback to simple mapping if AI fails
        return candidatePlaces.slice(0, 3).map(p => ({
            name: p.name,
            address: p.vicinity || p.formatted_address,
            rating: p.rating,
            reason: 'This is a highly-rated local option.'
        }));
    }
}

module.exports = { findPlaces };
