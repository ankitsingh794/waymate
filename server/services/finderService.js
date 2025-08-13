const axios = require('axios');
const logger = require('../utils/logger');
const { getAiJustifications, generateKeywordsForQuery } = require('./aiService');
const Place = require('../models/Place');
const { getCache, setCache } = require('../config/redis');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';
const CACHE_TTL_SECONDS = 3600;

async function findPlaces(query, location, userCoords) {
    if (!GOOGLE_API_KEY) {
        logger.error('GOOGLE_API_KEY is not configured for the finder service.');
        throw new Error('This feature is currently unavailable.');
    }

    const normalizedQuery = query.toLowerCase().trim();
    const normalizedLocation = location.toLowerCase().trim();
    
    let cacheKey = `v4-justified:${normalizedLocation}:${normalizedQuery}`;
    if (userCoords?.lat && userCoords?.lon) {
        const latKey = userCoords.lat.toFixed(3);
        const lonKey = userCoords.lon.toFixed(3);
        cacheKey = `v4-justified:geo-${latKey},${lonKey}:${normalizedQuery}`;
    }

    const cachedResults = await getCache(cacheKey);
    if (cachedResults) {
        logger.info(`Returning AI-justified places from Redis for "${query}"`);
        return cachedResults;
    }

    // --- Local Geospatial DB Search ---
    if (userCoords?.lat && userCoords?.lon) {
        const nearbyPlaces = await Place.find({
            query: normalizedQuery,
            location: {
                $nearSphere: { $geometry: { type: "Point", coordinates: [userCoords.lon, userCoords.lat] }, $maxDistance: 10000 }
            }
        }).limit(5);
        if (nearbyPlaces.length > 0) {
            logger.info(`Found ${nearbyPlaces.length} places in local geospatial DB.`);
            await setCache(cacheKey, nearbyPlaces, CACHE_TTL_SECONDS);
            return nearbyPlaces;
        }
    }

    // Generate API-friendly keywords from the user's conversational query.
    const apiKeywords = await generateKeywordsForQuery(query);
    logger.info(`Converted query "${query}" to API keywords: "${apiKeywords}"`);
    
    // --- Google Places API Search ---
    logger.info(`No cache or local DB results. Fetching new places for "${query}" via Google Places API.`);
    
    let candidatePlaces = [];
    try {
        const response = await axios.get(`${GOOGLE_PLACES_BASE}/textsearch/json`, {
            params: {
                query: `${apiKeywords} in ${normalizedLocation}`,
                key: GOOGLE_API_KEY
            }
        });
        candidatePlaces = response.data.results || [];
    } catch (error) {
        logger.error('Google Places API call failed:', error.message);
        return [];
    }

    if (candidatePlaces.length === 0) {
        await setCache(cacheKey, [], CACHE_TTL_SECONDS);
        return [];
    }

    const topCandidates = candidatePlaces.slice(0, 5);
    const placesForAI = topCandidates.map(p => ({ name: p.name, rating: p.rating, types: p.types }));
    const justifications = await getAiJustifications(query, placesForAI);

    const finalResults = topCandidates.map(p => {
        const photoRef = p.photos?.[0]?.photo_reference || null;
        return {
            name: p.name,
            address: p.vicinity || p.formatted_address,
            rating: p.rating,
            reason: justifications[p.name] || 'A popular and highly-rated local option.',
            place_id: p.place_id,
            imageUrl: photoRef 
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${GOOGLE_API_KEY}` 
                : null,
            query: normalizedQuery,
            city: normalizedLocation,
            location: {
                type: 'Point',
                coordinates: [p.geometry.location.lng, p.geometry.location.lat]
            }
        };
    });

    // Save results to DB and cache for future requests.
    await Place.insertMany(finalResults, { ordered: false }).catch(err => {
        // Ignore duplicate key errors (code 11000), log others.
        if (err.code !== 11000) logger.error('Error saving places to DB:', err);
    });
    await setCache(cacheKey, finalResults, CACHE_TTL_SECONDS);
    
    logger.info(`Finder service returned ${finalResults.length} AI-enhanced places for query: "${query}"`);
    return finalResults;
}

module.exports = { findPlaces };