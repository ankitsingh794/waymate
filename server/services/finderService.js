const axios = require('axios');
const logger = require('../utils/logger');
const { getFilteredResponse } = require('./aiService'); // We will add getFilteredResponse to aiService

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

/**
 * Finds and ranks places based on a natural language query and location.
 * @param {string} query The user's natural language query.
 * @param {string} location The city/area to search in.
 * @returns {Array} A ranked list of recommended places.
 */
async function findPlaces(query, location,  date_context) {
    if (!GOOGLE_API_KEY) {
        logger.error('GOOGLE_API_KEY is not configured for the finder service.');
        throw new Error('This feature is currently unavailable.');
    }

    let candidatePlaces = [];
    try {
        const response = await axios.get(`${GOOGLE_PLACES_BASE}/textsearch/json`, {
            params: {
                query: `${query} in ${location} ${date_context || ''}`,
                key: GOOGLE_API_KEY,
                fields: 'name,formatted_address,rating,user_ratings_total,reviews'
            }
        });
        candidatePlaces = response.data.results || [];
    } catch (error) {
        logger.error('Google Places API call failed in finderService:', error.message);
        throw new Error('Could not fetch places data.');
    }

    if (candidatePlaces.length === 0) {
        return [];
    }

    const filteringPrompt = `
        You are a discerning and helpful local guide. A user is looking for: "${query}".
        CRITICAL CONTEXT: They want to go on or during: "${date_context || 'any time'}".

        Based on the provided data, analyze the following list of places and return a ranked list of the top 3.
        For each match, provide a brief, one-sentence "reason" explaining why it's a good fit. Your reason MUST be relevant to the user's request and the time context if provided.

        Your response MUST be a single, valid JSON array of objects, with no other text.
        Each object should have "name", "address", "rating", and "reason".

        ### Candidate Places Data:
        ${JSON.stringify(candidatePlaces.slice(0, 15), null, 2)}
    `;
    
    try {
        const rankedResults = await getFilteredResponse(filteringPrompt);
        return rankedResults;
    } catch (error) {
        logger.error('AI filtering failed in finderService:', error.message);
        return candidatePlaces.slice(0, 3).map(p => ({
            name: p.name,
            address: p.formatted_address,
            rating: p.rating,
            reason: 'This is a highly-rated option based on user reviews.'
        }));
    }
}

module.exports = { findPlaces };