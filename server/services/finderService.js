const axios = require('axios');
const logger = require('../utils/logger');
const { getFilteredResponse } = require('./aiService');
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
    const cacheKey = `places:v3:${normalizedLocation}:${normalizedQuery}`;

    const cachedResults = await getCache(cacheKey);
    if (cachedResults) {
        logger.info(`Returning cached places from Redis for "${query}" in "${location}"`);
        return cachedResults;
    }

    // --- Geospatial Database Search ---
    if (userCoords?.lat && userCoords?.lon) {
        const nearbyPlaces = await Place.find({
            query: normalizedQuery,
            location: {
                $nearSphere: {
                    $geometry: {
                        type: "Point",
                        coordinates: [userCoords.lon, userCoords.lat]
                    },
                    $maxDistance: 5000
                }
            }
        }).limit(8);

        if (nearbyPlaces.length > 0) {
            logger.info(`Found ${nearbyPlaces.length} relevant places within 5km from the database.`);
            await setCache(cacheKey, nearbyPlaces, CACHE_TTL_SECONDS);
            return nearbyPlaces;
        }
    }

    const dbPlaces = await Place.find({ query: normalizedQuery, city: normalizedLocation }).limit(3);
    if (dbPlaces.length > 0) {
        logger.info(`Returning cached places from Database for "${query}" in "${location}"`);
        await setCache(cacheKey, dbPlaces, CACHE_TTL_SECONDS);
        return dbPlaces;
    }

    logger.info(`No cache found. Fetching new places for "${query}" in "${location}"`);
    let candidatePlaces = [];
    try {
        const response = await axios.get(`${GOOGLE_PLACES_BASE}/textsearch/json`, {
            params: { query: `${normalizedQuery} in ${normalizedLocation}`, key: GOOGLE_API_KEY }
        });
        candidatePlaces = response.data.results || [];
    } catch (error) {
        logger.error('Google Places API call failed:', error.message);
        throw new Error('Could not fetch places data.');
    }

    if (candidatePlaces.length === 0) return [];

    const candidatesMap = new Map(candidatePlaces.map(p => [p.name, p]));

    const filteringPrompt = `
You are a **witty and enthusiastic local food blogger** who knows all the hidden gems and popular spots in town.  
A user is searching for the best **"${query}"** — and you’re here to shortlist the top **9** places that absolutely *deserve* the spotlight.

---

### 🍴 YOUR TASK:
From the list of nearby candidates, choose the **top 9 places** and write a **fun, vivid, and natural-sounding one-liner reason** for each — like something you'd post on social media or a foodie blog.

---

### 🧠 HOW TO WRITE GREAT REASONS:
- Be creative — skip generic reasons like "has high ratings" or "serves ${query}."
- Let the **name inspire the vibe** (e.g., *"The Royal Street"* → “a timeless classic with royal flavors”).
- Use the **rating** to influence your tone:
  - **4.8–5.0:** “Unmissable”, “a knockout”, “the talk of the town”  
  - **4.3–4.7:** “Reliable”, “loved by locals”, “your new favorite”  
  - **Below 4.3:** “a wildcard pick worth checking out” or “a charming surprise”  
- Sound like you’re recommending it to a friend — casual, warm, and enthusiastic!
- Feel free to mention ambiance, dish highlights, or unexpected appeal based on the name and vibe.

---

### 🔧 RESPONSE FORMAT:
Return exactly **8 objects** in a **valid JSON array**, using this structure:
\`\`\`json
[
  {
    "name": "The Royal Street",
    "address": "123 King Ave",
    "rating": 4.9,
    "reason": "A timeless classic where every bite feels like a royal treat 👑"
  },
  ...
]
\`\`\`

---

### 📍 CANDIDATE PLACES:
${JSON.stringify(
        candidatePlaces.slice(0, 15).map((p) => ({
            name: p.name,
            address: p.vicinity,
            rating: p.rating,
        }))
    )}
`;


    try {
        const rankedResults = await getFilteredResponse(filteringPrompt);

        const finalResults = rankedResults.map(rankedPlace => {
            const originalPlace = candidatesMap.get(rankedPlace.name);
            const photoRef = originalPlace?.photos?.[0]?.photo_reference || null;

            return {
                ...rankedPlace,
                photo_reference: originalPlace?.photos?.[0]?.photo_reference || null,
                place_id: originalPlace?.place_id || null,
                imageUrl: photoRef
                    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${GOOGLE_API_KEY}`
                    : null
            };
        });

        const placesToSave = finalResults.map(place => {
            const originalPlace = candidatesMap.get(place.name);
            return {
                ...place,
                query: normalizedQuery,
                city: normalizedLocation,
                location: {
                    type: 'Point',
                    coordinates: [
                        originalPlace?.geometry?.location?.lng,
                        originalPlace?.geometry?.location?.lat
                    ]
                }
            };
        });
        await Place.insertMany(placesToSave, { ordered: false }).catch(err => {
            if (err.code !== 11000) logger.error('Error saving places to DB:', err);
        });

        await setCache(cacheKey, placesToSave, CACHE_TTL_SECONDS);
        return placesToSave;

    } catch (error) {
        logger.error('AI filtering failed in finderService:', error.message);
        return candidatePlaces.slice(0, 3).map(p => ({
            name: p.name,
            address: p.vicinity || p.formatted_address,
            rating: p.rating,
            reason: 'This is a highly-rated local option.',
            photo_reference: p.photos?.[0]?.photo_reference || null,
            place_id: p.place_id || null
        }));
    }
}

module.exports = { findPlaces };