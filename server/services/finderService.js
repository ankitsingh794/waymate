const axios = require('axios');
const logger = require('../utils/logger');
const { getAiJustifications, generateKeywordsForQuery } = require('./aiService');
const Place = require('../models/Place');
const { getCache, setCache } = require('../config/redis');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';
const CACHE_TTL_SECONDS = 3600; // 1 hour

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

    if (userCoords?.lat && userCoords?.lon) {
        const nearbyPlaces = await Place.find({
            query: normalizedQuery,
            location: {
                $nearSphere: { $geometry: { type: "Point", coordinates: [userCoords.lon, userCoords.lat] }, $maxDistance: 10000 }
            }
        }).limit(5).lean(); // Use .lean() for faster, plain JS objects
        if (nearbyPlaces.length > 0) {
            logger.info(`Found ${nearbyPlaces.length} places in local geospatial DB.`);
            await setCache(cacheKey, nearbyPlaces, CACHE_TTL_SECONDS);
            return nearbyPlaces;
        }
    }

    const apiKeywords = await generateKeywordsForQuery(query);
    logger.info(`Converted query "${query}" to API keywords: "${apiKeywords}"`);
    
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

    // **[FIX] Process each place to ensure it's saved and contains a database _id before returning.**
    const processingPromises = topCandidates.map(async (p) => {
        const photoRef = p.photos?.[0]?.photo_reference || null;
        const placeData = {
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

        // Atomically find and update or create a new document.
        // This ensures no duplicates and returns the full document with the _id.
        return Place.findOneAndUpdate(
            { place_id: p.place_id }, // Find document by Google's unique place_id
            { $setOnInsert: placeData }, // Only set data on initial creation
            { upsert: true, new: true, lean: true } // Create if not exists, return the new doc, and as a plain object
        );
    });

    const finalResults = await Promise.all(processingPromises);

    await setCache(cacheKey, finalResults, CACHE_TTL_SECONDS);
    
    logger.info(`Finder service returned ${finalResults.length} AI-enhanced places for query: "${query}"`);
    return finalResults;
}


/**
 * [NEW & EFFICIENT] Identifies the most likely place at a given set of coordinates.
 * This is a lightweight version of findPlaces, optimized for the passive tracking service.
 * It does NOT use AI for justifications.
 * @param {object} coords - The { lat, lon } coordinates of the stop.
 * @returns {Promise<object|null>} The full Mongoose document for the identified place, or null.
 */
const identifyPlaceByCoordinates = async (coords) => {
    const { lat, lon } = coords;
    const cacheKey = `place-at:${lat.toFixed(4)},${lon.toFixed(4)}`;

    const cached = await getCache(cacheKey);
    if (cached) {
        logger.info(`Returning cached place identification for coordinates.`);
        return cached;
    }
    
    try {
        const response = await axios.get(`${GOOGLE_PLACES_BASE}/nearbysearch/json`, {
            params: {
                location: `${lat},${lon}`,
                rankby: 'distance',
                key: GOOGLE_API_KEY
            }
        });

        const primaryPlaceData = response.data.results?.[0];

        if (!primaryPlaceData) {
            logger.warn(`No place identified at coordinates ${lat},${lon}.`);
            return null;
        }

        const photoRef = primaryPlaceData.photos?.[0]?.photo_reference || null;
        const placeData = {
            name: primaryPlaceData.name,
            address: primaryPlaceData.vicinity,
            rating: primaryPlaceData.rating,
            place_id: primaryPlaceData.place_id,
            imageUrl: photoRef ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${GOOGLE_API_KEY}` : null,
            city: primaryPlaceData.plus_code?.compound_code.split(',')[1]?.trim() || 'Unknown',
            location: {
                type: 'Point',
                coordinates: [primaryPlaceData.geometry.location.lng, primaryPlaceData.geometry.location.lat]
            }
        };
        
        const place = await Place.findOneAndUpdate(
            { place_id: primaryPlaceData.place_id },
            { $setOnInsert: placeData },
            { upsert: true, new: true, lean: true }
        );
        
        await setCache(cacheKey, place, 3600 * 24); // Cache for 24 hours
        return place;

    } catch (error) {
        logger.error('Failed to identify place by coordinates.', { error: error.message });
        return null;
    }
};

module.exports = { findPlaces, identifyPlaceByCoordinates };