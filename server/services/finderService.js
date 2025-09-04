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
        // Ensure we return a full Mongoose object if needed, or just the data.
        // For this use case, returning the cached data is sufficient.
        return cached;
    }
    
    try {
        // Use Google Places Nearby Search, ranked by distance, to find the closest POI.
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

        // Check if this place already exists in our DB to avoid duplicates.
        let place = await Place.findOne({ place_id: primaryPlaceData.place_id });

        if (!place) {
            // If it's a new place, create it.
            const photoRef = primaryPlaceData.photos?.[0]?.photo_reference || null;
            place = await Place.create({
                name: primaryPlaceData.name,
                address: primaryPlaceData.vicinity,
                rating: primaryPlaceData.rating,
                place_id: primaryPlaceData.place_id,
                imageUrl: photoRef ? getGooglePhotoUrl(photoRef) : null,
                city: primaryPlaceData.plus_code?.compound_code.split(',')[1]?.trim() || 'Unknown',
                location: {
                    type: 'Point',
                    coordinates: [primaryPlaceData.geometry.location.lng, primaryPlaceData.geometry.location.lat]
                }
            });
        }
        
        // Cache the resulting place object for future lookups.
        await setCache(cacheKey, place.toObject(), 3600 * 24); // Cache for 24 hours
        return place.toObject();

    } catch (error) {
        logger.error('Failed to identify place by coordinates.', { error: error.message });
        return null;
    }
};


module.exports = { findPlaces, identifyPlaceByCoordinates };