const axios = require('axios');
const logger = require('../utils/logger');
const { setCache, getCache, incrCache } = require('../config/redis');
const { fetchThreatAlertsForDestination } = require('../services/alertService');

const OPENTRIPMAP_BASE = 'https://api.opentripmap.com/0.1/en/places';
const OPENWEATHER_FORECAST_BASE = 'https://api.openweathermap.org/data/2.5/forecast'; // ✅ Correct endpoint for forecast
const UNSPLASH_BASE = 'https://api.unsplash.com/search/photos';

const MAPBOX_DIRECTIONS_BASE = 'https://api.mapbox.com/directions/v5/mapbox';
const MAPBOX_STATIC_BASE = 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static';
const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

const OPENTRIPMAP_API_KEY = process.env.OPENTRIPMAP_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_SECRET_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const DEFAULT_IMAGE_URL =
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';


const INDIA_ACCOMMODATION_COSTS = {
  'metro-luxury': { budget: 3500, standard: 7000, luxury: 15000 }, // e.g., South Mumbai, Lutyens' Delhi
  'tier-1-resort': { budget: 4000, standard: 8000, luxury: 20000 }, // e.g., Goa, Andaman, Premium Kerala resorts
  'tier-1-city': { budget: 2500, standard: 5000, luxury: 10000 }, // e.g., Bangalore, Hyderabad, Pune
  'himalayan-peak': { budget: 3000, standard: 6000, luxury: 12000 }, // e.g., Leh, Manali (peak season)
  'himalayan-off': { budget: 1500, standard: 3500, luxury: 8000 }, // e.g., Himachal, Uttarakhand (off season)
  'tier-2-city': { budget: 1200, standard: 2500, luxury: 6000 }, // e.g., Jaipur, Lucknow, Kochi
  'remote': { budget: 800, standard: 1800, luxury: 4000 }, // e.g., Northeast, smaller towns
  'default': { budget: 1500, standard: 3000, luxury: 7000 }  // A general fallback
};

/**
 * A mapping of major Indian cities and states to their cost tiers.
 * This allows for more granular budget estimation.
 */
const INDIAN_LOCATION_COST_TIERS = {
  // States
  'Goa': 'tier-1-resort',
  'Andaman and Nicobar Islands': 'tier-1-resort',
  'Kerala': 'tier-1-resort',
  'Maharashtra': 'tier-1-city',
  'Karnataka': 'tier-1-city',
  'Delhi': 'metro-luxury',
  'Himachal Pradesh': 'himalayan-peak',
  'Uttarakhand': 'himalayan-peak',
  'Ladakh': 'himalayan-peak',
  'Rajasthan': 'tier-2-city',
  'Uttar Pradesh': 'tier-2-city',
  // Specific Cities (override state-level)
  'Mumbai': 'metro-luxury',
  'Bangalore': 'tier-1-city',
  'Hyderabad': 'tier-1-city',
  'Pune': 'tier-1-city',
  'Jaipur': 'tier-2-city',
  'Shimla': 'himalayan-peak',
  'Manali': 'himalayan-peak',
  'Leh': 'himalayan-peak',
};

// Free tier limits
const LIMITS = {
  mapboxDirections: 100000,
  staticImages: 50000
};

// Redis keys for API usage tracking
const MAPBOX_DIRECTIONS_KEY = 'usage:mapbox:directions';
const MAPBOX_STATIC_KEY = 'usage:mapbox:static';

/**
 * ✅ Retry wrapper with improved logging
 */
async function retry(fn, description = 'API call', retries = 2, shouldRetry = null) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const status = err.response?.status;
      const isNetworkError = !err.response; // No response => network failure
      const isServerError = status >= 500;

      const retryAllowed = shouldRetry
        ? shouldRetry(err)
        : (isNetworkError || isServerError);

      // ✅ More descriptive log message
      logger.warn(`${description} failed (attempt ${attempt + 1}): ${err.message}`);

      if (!retryAllowed || attempt === retries) {
        break;
      }

      await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
    }
  }

  throw lastError;
}


/**
 * ✅ Check and increment API usage in Redis
 */
const checkAndIncrementUsage = async (key, limit) => {
  const usage = await incrCache(key, 1, 2592000); // 30 days
  if (usage > limit) {
    logger.warn(`API limit reached for ${key}. Usage: ${usage}`);
    return false;
  }
  return true;
};

/**
 * ✅ Fetch route data using Mapbox Directions API
 */
const haversineDistance = (coords1, coords2) => {
  const R = 6371; // Radius of Earth in km
  const lat1 = coords1.lat * Math.PI / 180;
  const lat2 = coords2.lat * Math.PI / 180;
  const dLat = lat2 - lat1;
  const dLon = (coords2.lon - coords1.lon) * Math.PI / 180;

  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))); // Distance in km
};


const getRouteData = async (origin, destination, includeStaticMap = false) => {
  // Constants for cost calculation per km
  const COSTS_PER_KM = {
    driving: 0.2,
    cycling: 0.05,
    bus: 0.1,
    flight: 0.5,
    train: 0.15
  };

  // Speeds in km/h for fallback
  const SPEEDS_KMH = {
    driving: 60,
    cycling: 15,
    bus: 50,
    flight: 800,
    train: 100,
    walking: 5
  };

  try {
    // Validate input coordinates
    if (
      !origin?.lat || !origin?.lon ||
      !destination?.lat || !destination?.lon ||
      isNaN(origin.lat) || isNaN(origin.lon) ||
      isNaN(destination.lat) || isNaN(destination.lon)
    ) {
      throw new Error(`Invalid coordinates: origin=${JSON.stringify(origin)}, destination=${JSON.stringify(destination)}`);
    }

    // Check Mapbox directions API usage quota
    const canCallDirections = await checkAndIncrementUsage(MAPBOX_DIRECTIONS_KEY, LIMITS.mapboxDirections);
    if (!canCallDirections) throw new Error('Mapbox Directions limit reached');

    const modes = ['driving', 'cycling', 'walking'];
    const results = {};

    // Fetch routes for all modes concurrently
    await Promise.all(modes.map(async (mode) => {
      const url = `${MAPBOX_DIRECTIONS_BASE}/${mode}/${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;

      try {
        const res = await retry(
          () => axios.get(url, {
            params: {
              access_token: MAPBOX_ACCESS_TOKEN,
              geometries: 'geojson'
            }
          }),
          `Mapbox Directions (${mode})`, // ✅ Descriptive name for retry logging
          1,
          (err) => {
            // Retry only on network or 5xx, skip 422 errors
            if (err.response && err.response.status === 422) return false;
            return !err.response || err.response.status >= 500;
          }
        );

        if (!res.data?.routes?.length) {
          logger.warn(`No routes found for mode: ${mode}`);
          return;
        }

        const routeData = res.data.routes[0];
        const durationHours = Math.max(1, Math.ceil(routeData.duration / 3600));
        const distanceKm = Math.max(1, Math.ceil(routeData.distance / 1000));

        // Calculate cost based on mode & distance
        const cost = COSTS_PER_KM[mode] ? Math.round(distanceKm * COSTS_PER_KM[mode]) : 0;

        results[mode] = {
          mode,
          duration: `${durationHours}h`,
          distance: `${distanceKm} km`,
          cost
        };

      } catch (err) {
        logger.warn(`Mapbox call failed for mode: ${mode}`, { error: err.message });
      }
    }));

    // If no routes found from Mapbox, throw to fallback
    if (Object.keys(results).length === 0) {
      throw new Error('No valid routes returned from Mapbox');
    }

    // Add train estimate using distance (prefer driving distance or fallback haversine)
    const distanceForTrain = results.driving
      ? parseInt(results.driving.distance)
      : haversineDistance(origin, destination);

    results.train = {
      mode: 'Train',
      duration: `${Math.max(1, Math.ceil(distanceForTrain / SPEEDS_KMH.train))}h`,
      distance: `${Math.round(distanceForTrain)} km`,
      cost: Math.round(distanceForTrain * COSTS_PER_KM.train)
    };

    // Find fastest and cheapest routes by comparing duration and cost
    const fastest = Object.values(results).reduce((a, b) =>
      parseInt(a.duration) < parseInt(b.duration) ? a : b
    );

    const cheapest = Object.values(results).reduce((a, b) =>
      a.cost < b.cost ? a : b
    );

    // Optional: Generate static map URL if requested and within usage limits
    let staticMapUrl = null;
    if (includeStaticMap) {
      const canCallStatic = await checkAndIncrementUsage(MAPBOX_STATIC_KEY, LIMITS.staticImages);
      if (canCallStatic) {
        const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
        staticMapUrl = `${MAPBOX_STATIC_BASE}/path-5+f44-0.5(${coords})/auto/800x400?access_token=${MAPBOX_ACCESS_TOKEN}`;
      }
    }

    return { fastest, cheapest, details: results, staticMap: staticMapUrl };

  } catch (error) {
    logger.error('Mapbox Directions failed. Using fallback estimation.', {
      error: error.message,
      origin,
      destination
    });

    // Fallback: calculate distances and durations with estimated costs for all modes
    const distanceKm = haversineDistance(origin, destination);

    const fallbackDetails = {
      driving: {
        mode: 'Car',
        duration: `${Math.max(1, Math.ceil(distanceKm / SPEEDS_KMH.driving))}h`,
        cost: Math.round(distanceKm * COSTS_PER_KM.driving),
        distance: `${Math.round(distanceKm)} km`
      },
      bus: {
        mode: 'Bus',
        duration: `${Math.max(1, Math.ceil(distanceKm / SPEEDS_KMH.bus))}h`,
        cost: Math.round(distanceKm * COSTS_PER_KM.bus),
        distance: `${Math.round(distanceKm)} km`
      },
      flight: {
        mode: 'Flight',
        duration: `${Math.max(1, Math.ceil(distanceKm / SPEEDS_KMH.flight))}h`,
        cost: Math.round(distanceKm * COSTS_PER_KM.flight),
        distance: `${Math.round(distanceKm)} km`
      },
      train: {
        mode: 'Train',
        duration: `${Math.max(1, Math.ceil(distanceKm / SPEEDS_KMH.train))}h`,
        cost: Math.round(distanceKm * COSTS_PER_KM.train),
        distance: `${Math.round(distanceKm)} km`
      },
      cycling: {
        mode: 'Cycling',
        duration: `${Math.max(1, Math.ceil(distanceKm / SPEEDS_KMH.cycling))}h`,
        cost: Math.round(distanceKm * COSTS_PER_KM.cycling),
        distance: `${Math.round(distanceKm)} km`
      },
      walking: {
        mode: 'Walking',
        duration: `${Math.max(1, Math.ceil(distanceKm / SPEEDS_KMH.walking))}h`,
        cost: 0,
        distance: `${Math.round(distanceKm)} km`
      }
    };

    // Choose fallback fastest and cheapest
    const fallbackFastest = Object.values(fallbackDetails).reduce((a, b) =>
      parseInt(a.duration) < parseInt(b.duration) ? a : b
    );
    const fallbackCheapest = Object.values(fallbackDetails).reduce((a, b) =>
      a.cost < b.cost ? a : b
    );

    return {
      fastest: fallbackFastest,
      cheapest: fallbackCheapest,
      details: fallbackDetails,
      staticMap: null
    };
  }
};

/**
 * Aggregate Trip Data from multiple APIs with caching and fallbacks
 */
const aggregateTripData = async ({
  destination,
  origin = { lat: 28.6139, lon: 77.2090 },
  startDate,
  endDate,
  travelers = 1,
  preferences = {}
}) => {
  if (!destination || !startDate || !endDate) {
    throw new Error('Destination, startDate, and endDate are required');
  }
  if (new Date(endDate) < new Date(startDate)) {
    throw new Error('End date must be after start date');
  }

  const {
    language = 'English',
    currency = 'USD',
    interests = ['General sightseeing'],
    accommodationType = 'budget'
  } = preferences;

  // ✅ NEW: Logic to build personalized query parameters
  const personalizedParams = {};

  // Build a dynamic keyword from user interests
  if (interests && interests.length > 0 && interests[0] !== 'General sightseeing') {
    personalizedParams.keyword = interests.join('|'); // e.g., "history|art gallery|museum"
  } else {
    // Fallback to a general but effective keyword
    personalizedParams.keyword = 'tourist attraction|landmark|point of interest';
  }

  // Map budget preference to Google's price levels (0-4)
  if (accommodationType === 'budget') {
    personalizedParams.maxprice = 2;
  } else if (accommodationType === 'luxury') {
    personalizedParams.minprice = 3;
  }

  let destinationCoords = null;
  let destinationName = '';
  let destinationState = '';

  try {
    // --- Geocoding Logic ---
    if (typeof destination === 'string') {
      const geoCacheKey = `geo:${destination.toLowerCase()}`;
      const geoCached = await getCache(geoCacheKey);
      if (geoCached) {
        destinationCoords = geoCached.coords;
        destinationName = geoCached.name;
        destinationState = geoCached.state; // ✅ Get from cache
      } else {
        const geoRes = await retry(() => axios.get(`${OPENTRIPMAP_BASE}/geoname`, { params: { name: destination, country: 'in', apikey: process.env.OPENTRIPMAP_API_KEY } }), 'OpenTripMap Geocoding');
        if (geoRes?.data?.lat && geoRes?.data?.lon) {
          destinationCoords = { lat: geoRes.data.lat, lon: geoRes.data.lon };
          destinationName = geoRes.data.name || destination;
          destinationState = geoRes.data.state?.name || ''; // ✅ Get state from geocoding API
          await setCache(geoCacheKey, { coords: destinationCoords, name: destinationName, state: destinationState }, 86400);
        } else {
          destinationCoords = { lat: 18.5204, lon: 73.8567 }; // Fallback
          destinationName = destination;
        }
      }
    } else if (destination?.lat && destination?.lon) {
      destinationCoords = destination;
      destinationName = `Custom Location (${destination.lat.toFixed(2)}, ${destination.lon.toFixed(2)})`;
    } else {
      throw new Error('Invalid destination format: must be string or {lat, lon}');
    }


    const cacheKey = `v3:trip:${destinationName.replace(/\s+/g, '_')}:${startDate}:${endDate}:${travelers}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      logger.info(`✅ Returning cached trip for ${destinationName}`);
      return cached;
    }

    const [attractionsRes, foodRes, weatherRes, unsplashRes, routeRes, accommodationRes] = await Promise.allSettled([
      // ✅ NEW: Google Places is now the primary source for attractions
      retry(() => axios.get(GOOGLE_PLACES_BASE, {
        params: {
          location: `${destinationCoords.lat},${destinationCoords.lon}`,
          radius: 5000,
          ...personalizedParams,
          key: GOOGLE_API_KEY,
        }
      }), 'Google Places Attractions'),
      retry(() => axios.get(GOOGLE_PLACES_BASE, {
        params: {
          location: `${destinationCoords.lat},${destinationCoords.lon}`,
          radius: 5000,
          keyword: 'hotel|lodging|inn|hostel',
          ...personalizedParams,
          key: GOOGLE_API_KEY,
        }
      }), 'Google Places Accommodations'),
      retry(() => axios.get(`${OPENTRIPMAP_BASE}/radius`, {
        params: { lat: destinationCoords.lat, lon: destinationCoords.lon, radius: 5000, kinds: 'restaurants,cafes,food,bar', rate: 3, limit: 8, apikey: OPENTRIPMAP_API_KEY }
      }), 'OpenTripMap Food'),
      retry(() => axios.get(OPENWEATHER_FORECAST_BASE, {
        params: { lat: destinationCoords.lat, lon: destinationCoords.lon, appid: OPENWEATHER_API_KEY, units: 'metric' }
      }), 'OpenWeatherMap Forecast'),
      retry(() => axios.get(UNSPLASH_BASE, {
        params: { query: destinationName, per_page: 1, client_id: UNSPLASH_ACCESS_KEY }
      }), 'Unsplash Image'),
      getRouteData(origin, destinationCoords)
    ]);

    // ✅ NEW: Cascading fallback logic for attractions
    let attractions;
    if (attractionsRes.status === 'fulfilled' && attractionsRes.value.data?.results?.length > 0) {
      attractions = attractionsRes.value.data.results.slice(0, 10).map(g => ({
        name: g.name,
        kinds: g.types.join(', '),
        description: `Rating: ${g.rating || 'N/A'} (${g.user_ratings_total || 0} reviews) - ${g.vicinity}`,
        image: g.photos ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${g.photos[0].photo_reference}&key=${GOOGLE_API_KEY}` : null,
        website: g.website || null // ADDED THIS LINE
      }));
      logger.info('✅ Successfully fetched attractions from Google Places API.');
    } else {
      // Primary source failed, try fallback (OpenTripMap)
      logger.warn('Google Places attractions search failed. Trying OpenTripMap fallback...');
      try {
        const otmRes = await retry(() => axios.get(`${OPENTRIPMAP_BASE}/radius`, {
          params: { lat: destinationCoords.lat, lon: destinationCoords.lon, radius: 5000, rate: 3, limit: 10, apikey: OPENTRIPMAP_API_KEY }
        }), 'OpenTripMap Attractions Fallback');

        if (otmRes.data?.features?.length > 0) {
          attractions = otmRes.data.features.map(p => ({
            name: p.properties.name || 'Unnamed place',
            kinds: p.properties.kinds || '',
            description: p.properties.wikipedia_extracts?.text || null,
            image: p.properties.preview?.source || null,
          }));
          logger.info('✅ Successfully fetched attractions from OpenTripMap fallback.');
        } else {
          throw new Error('OpenTripMap fallback returned no results.');
        }
      } catch (err) {
        logger.error(`OpenTripMap attractions fallback also failed: ${err.message}`);
        attractions = [{ name: 'City Museum' }, { name: 'Top Local Park' }];
      }
    }

    let accommodationSuggestions = [];
    if (accommodationRes.status === 'fulfilled' && accommodationRes.value.data?.results?.length > 0) {
      accommodationSuggestions = accommodationRes.value.data.results.slice(0, 5).map(place => ({
        name: place.name,
        rating: place.rating || 'N/A',
        user_ratings_total: place.user_ratings_total || 0,
        vicinity: place.vicinity,
        photoUrl: place.photos ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_API_KEY}` : null,
        website: place.website || null // ADDED THIS LINE
      }));
      logger.info('✅ Successfully fetched accommodations from Google Places.');
    } else {
      logger.warn('Could not fetch accommodation suggestions.');
    }

    // Cascading fallback logic for food recommendations
    let foodRecommendations;
    if (foodRes.status === 'fulfilled' && foodRes.value.data?.features?.length > 0) {
      foodRecommendations = foodRes.value.data.features.map(p => ({
        name: p.properties.name || 'Unnamed eatery',
        kinds: p.properties.kinds || '',
        description: p.properties.wikipedia_extracts?.text || null,
      }));
    } else {
      logger.warn('OpenTripMap food search failed. Trying Google Places API fallback...');
      try {
        if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY is not configured.');
        const googleRes = await axios.get(GOOGLE_PLACES_BASE, {
          params: { location: `${destinationCoords.lat},${destinationCoords.lon}`, radius: 5000, keyword: 'restaurant|cafe|coffee shop|street food|local cuisine|diner|bistro|brunch spot|fast food|food court|bakery|dessert shop|ice cream|barbecue|buffet|grill|fine dining|gastropub|brewery|winery|pub|food festival', key: GOOGLE_API_KEY, }
        });
        if (googleRes.data.results && googleRes.data.results.length > 0) {
          foodRecommendations = googleRes.data.results.slice(0, 8).map(g => ({
            name: g.name,
            kinds: g.types.join(', '),
            description: `Rating: ${g.rating} (${g.user_ratings_total} reviews) - ${g.vicinity}`,
            website: g.website || null // ADDED THIS LINE
          }));
          logger.info('✅ Successfully fetched food data from Google Places API.');
        }
      } catch (err) {
        logger.error(`Google Places API fallback also failed: ${err.message}`);
        foodRecommendations = [{ name: 'Local Café' }, { name: 'Street Food Corner' }];
      }
    }

    // ... (Weather, coverImage, route, budget, and alerts logic remains unchanged)
    const forecast = [];
    if (weatherRes.status === 'fulfilled' && weatherRes.value.data?.list) {
      const daysMap = {};
      weatherRes.value.data.list.forEach(entry => {
        const dayString = entry.dt_txt.split(' ')[0];
        if (!daysMap[dayString]) {
          daysMap[dayString] = {
            date: dayString, temp: entry.main.temp, temp_min: entry.main.temp_min, temp_max: entry.main.temp_max,
            condition: entry.weather[0].description, icon: entry.weather[0].icon, chance_of_rain: entry.pop, wind_speed: entry.wind.speed,
          };
        }
      });
      const uniqueDays = Object.values(daysMap).slice(0, 5);
      uniqueDays.forEach((dayData, index) => forecast.push({ day: index + 1, ...dayData }));
    }
    const weather = { forecast: forecast.length > 0 ? forecast : [{ day: 1, date: 'N/A', temp: 'N/A', condition: 'No forecast available' }] };
    const coverImage = (unsplashRes.status === 'fulfilled' && unsplashRes.value.data.results?.[0]?.urls?.regular) ? unsplashRes.value.data.results[0].urls.regular : DEFAULT_IMAGE_URL;
    const route = routeRes.status === 'fulfilled' ? routeRes.value : {};
    const nights = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
    const costTier = INDIAN_LOCATION_COST_TIERS[destinationName] || INDIAN_LOCATION_COST_TIERS[destinationState] || 'default';
    const regionalCosts = INDIA_ACCOMMODATION_COSTS[costTier];
    const accommodationType = preferences.accommodationType || 'standard';
    const accommodationCost = (regionalCosts[accommodationType] || regionalCosts.standard) * nights;
    const travelCost = route?.cheapest?.cost || 0;
    const activityCost = attractions.length * 20;
    const foodCost = nights * 1500 * travelers;
    const budget = {
      travel: travelCost,
      accommodation: accommodationCost,
      activities: activityCost,
      food: foodCost,
      total: (travelCost + accommodationCost + activityCost + foodCost)
    };
    const alerts = await fetchThreatAlertsForDestination(destinationName);


    const aggregatedData = {
      destinationName, origin, destinationCoords, startDate, endDate, travelers,
      preferences: { language, currency, interests, accommodationType },
      attractions,
      foodRecommendations,
      accommodationSuggestions,
      weather,
      coverImage,
      route,
      budget,
      alerts: alerts.length > 0 ? alerts : ['No critical alerts found. Always check local travel guidelines.']
    };

    await setCache(cacheKey, aggregatedData, 600);
    logger.info(`✅ Trip data aggregated successfully for ${destinationName}`);
    return aggregatedData;

  } catch (error) {
    logger.error('❌ Trip aggregation failed', { error: error.message, stack: error.stack });
    throw new Error('Failed to aggregate trip data');
  }
};

module.exports = { aggregateTripData };