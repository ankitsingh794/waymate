const axios = require('axios');
const logger = require('../utils/logger');
const { setCache, getCache, incrCache } = require('../config/redis');
const { fetchThreatAlertsForDestination } = require('./alertService');
const { fetchLocalEvents } = require('./eventService');
const currencyService = require('./currencyService');
const { BUDGET_CONFIG } = require('../config/budgetConfig');

const {
  OPENTRIPMAP_API_KEY,
  OPENWEATHER_API_KEY,
  UNSPLASH_ACCESS_KEY,
  MAPBOX_ACCESS_TOKEN,
  GOOGLE_API_KEY,
  OPENTRIPMAP_BASE,
  OPENWEATHER_BASE,
  UNSPLASH_BASE,
  MAPBOX_DIRECTIONS_BASE,
  MAPBOX_STATIC_BASE,
  GOOGLE_PLACES_BASE,
  LIMITS,
  MAPBOX_DIRECTIONS_KEY,
  MAPBOX_STATIC_KEY,
  GOOGLE_DISTANCE_MATRIX_BASE,
} = require('../config/apiConfig');

// Sub-schema for attractions
const API_LANGUAGE_CODES = {
  'english': 'en',
  'hindi': 'hi',
  'bengali': 'bn',
  'tamil': 'ta',
  'telugu': 'te',
  'kannada': 'kn',
  'marathi': 'mr',
  'gujarati': 'gu',
  'malayalam': 'ml',
  'punjabi': 'pa',
};

const PREFERENCE_TO_API_MAP = {
  interests: {
    param: 'keyword',
    // Default keywords if no specific interests are provided by the user.
    default: 'tourist attraction|landmark|point of interest',
    // Joins multiple interests with a pipe for the 'keyword' parameter.
    formatter: (values) => (Array.isArray(values) ? values.join('|') : values),
  },
  accommodationType: {
    param: 'keyword',
    // Maps user-friendly terms to more specific API keywords.
    mappings: {
      budget: 'hostel|guesthouse|budget hotel',
      standard: 'hotel|lodging|inn',
      luxury: 'luxury hotel|5-star hotel|resort',
    },
  },
};


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

    const canCallDirections = await checkAndIncrementUsage(MAPBOX_DIRECTIONS_KEY, LIMITS.mapboxDirections);
    if (!canCallDirections) throw new Error('Mapbox Directions limit reached');

    const distanceKm = haversineDistance(origin, destination);
    const modes = ['driving'];
    if (distanceKm < 50) modes.push('cycling');
    if (distanceKm < 10) modes.push('walking');

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
          `Mapbox Directions (${mode})`,
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

    const distanceKm = haversineDistance(origin, destination);
    const fallbackDetails = {};

    for (const mode in SPEEDS_KMH) {
      fallbackDetails[mode] = {
        mode: mode.charAt(0).toUpperCase() + mode.slice(1),
        duration: `${Math.max(1, Math.ceil(distanceKm / SPEEDS_KMH[mode]))}h`,
        cost: Math.round(distanceKm * (COSTS_PER_KM[mode] || 0)),
        distance: `${Math.round(distanceKm)} km`
      };
    }

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
 * Finds the fastest transportation hub (airport, train station) to reach from a user's location.
 * @param {object} originCoords The user's starting { lat, lon }.
 * @param {string} hubType The type of hub to search for (e.g., 'airport').
 * @returns {Promise<object|null>} The best hub and travel details for the first leg of the journey.
 */
async function findFastestHub(originCoords, hubType) {
  try {
    const placesResponse = await axios.get(GOOGLE_PLACES_BASE, { params: { location: `${originCoords.lat},${originCoords.lon}`, rankby: 'distance', type: hubType, key: GOOGLE_API_KEY } });
    const candidateHubs = placesResponse.data.results.slice(0, 3);
    if (candidateHubs.length === 0) return null;

    const destinationParams = candidateHubs.map(h => `${h.geometry.location.lat},${h.geometry.location.lng}`).join('|');
    const matrixResponse = await axios.get(GOOGLE_DISTANCE_MATRIX_BASE, { params: { origins: `${originCoords.lat},${originCoords.lon}`, destinations: destinationParams, departure_time: 'now', key: GOOGLE_API_KEY } });

    if (!matrixResponse.data.rows || matrixResponse.data.rows.length === 0) {
      logger.warn(`Distance Matrix API returned no rows for hub type '${hubType}'.`);
      return null;
    }

    let fastestLeg = null, shortestDuration = Infinity;
    matrixResponse.data.rows[0].elements.forEach((element, index) => {
      if (element.status === 'OK' && element.duration_in_traffic.value < shortestDuration) {
        shortestDuration = element.duration_in_traffic.value;
        const bestHub = candidateHubs[index];
        fastestLeg = {
          hub: { name: bestHub.name, coords: { lat: bestHub.geometry.location.lat, lon: bestHub.geometry.location.lng } },
          travel: { durationValue: element.duration_in_traffic.value, durationText: element.duration_in_traffic.text, distanceText: element.distance.text, cost: Math.round((element.distance.value / 1000) * 12) } // Assumes ~₹12/km for taxi
        };
      }
    });
    return fastestLeg;
  } catch (error) {
    logger.error(`Error in findFastestHub for type '${hubType}':`, { message: error.message });
    return null;
  }
}

/**
 * Estimates the time and cost for the main journey between two hubs.
 */
function estimateMainLeg(originHub, destinationHub, mode) {
  const SPEEDS_KMH = { flight: 700, train: 80 };
  const COSTS_PER_KM_INR = { flight: 5.5, train: 1.2 };
  const distanceKm = haversineDistance(originHub.coords, destinationHub.coords);
  const durationHours = Math.round(distanceKm / SPEEDS_KMH[mode]);
  const cost = Math.round(distanceKm * COSTS_PER_KM_INR[mode]);
  return { durationValue: durationHours * 3600, durationText: `${durationHours}h`, cost };
}

/**
 * The main orchestrator for door-to-door route calculations.
 */
async function getDoorToDoorRoute(originCoords, destinationCoords) {
  const travelOptions = {};

  // --- Calculate Flight Option Concurrently ---
  const [originAirportLeg, destinationAirportLeg] = await Promise.all([
    findFastestHub(originCoords, 'airport'),
    findFastestHub(destinationCoords, 'airport')
  ]);
  if (originAirportLeg && destinationAirportLeg) {
    const mainFlightLeg = estimateMainLeg(originAirportLeg.hub, destinationAirportLeg.hub, 'flight');
    const totalDurationSec = originAirportLeg.travel.durationValue + mainFlightLeg.durationValue + destinationAirportLeg.travel.durationValue;
    const totalCost = originAirportLeg.travel.cost + mainFlightLeg.cost + destinationAirportLeg.travel.cost;
    travelOptions.flight = { mode: 'Flight', durationValue: totalDurationSec, durationText: `${Math.round(totalDurationSec / 3600)}h total`, cost: totalCost, details: `Fly from ${originAirportLeg.hub.name} to ${destinationAirportLeg.hub.name}.` };
  }

  // --- Calculate Train Option Concurrently ---
  const [originTrainLeg, destinationTrainLeg] = await Promise.all([
    findFastestHub(originCoords, 'train_station'),
    findFastestHub(destinationCoords, 'train_station')
  ]);
  if (originTrainLeg && destinationTrainLeg) {
    const mainTrainLeg = estimateMainLeg(originTrainLeg.hub, destinationTrainLeg.hub, 'train');
    const totalDurationSec = originTrainLeg.travel.durationValue + mainTrainLeg.durationValue + destinationTrainLeg.travel.durationValue;
    const totalCost = originTrainLeg.travel.cost + mainTrainLeg.cost + destinationTrainLeg.travel.cost;
    travelOptions.train = { mode: 'Train', durationValue: totalDurationSec, durationText: `${Math.round(totalDurationSec / 3600)}h total`, cost: totalCost, details: `Train from ${originTrainLeg.hub.name} to ${destinationTrainLeg.hub.name}.` };
  }

  const finalOptions = Object.values(travelOptions);
  if (finalOptions.length === 0) return { fastest: { mode: 'N/A' }, cheapest: { mode: 'N/A' }, details: {} };

  const fastest = finalOptions.reduce((a, b) => a.durationValue < b.durationValue ? a : b);
  const cheapest = finalOptions.reduce((a, b) => a.cost < b.cost ? a : b);
  return { fastest, cheapest, details: travelOptions };
}



async function getGeocodedLocation(destination) {
  if (typeof destination === 'object' && destination.lat && destination.lon) {
    return {
      coords: destination,
      name: `Custom Location (${destination.lat.toFixed(2)}, ${destination.lon.toFixed(2)})`,
      state: ''
    };
  }

  if (typeof destination !== 'string') {
    throw new Error('Invalid destination format: must be string or {lat, lon}');
  }

  const geoCacheKey = `geo:${destination.toLowerCase()}`;
  const cached = await getCache(geoCacheKey);
  if (cached) return cached;

  const geoRes = await retry(() => axios.get(`${OPENTRIPMAP_BASE}/geoname`, { params: { name: destination, country: 'in', apikey: OPENTRIPMAP_API_KEY } }), 'OpenTripMap Geocoding');

  if (geoRes?.data?.lat && geoRes?.data?.lon) {
    const locationInfo = {
      coords: { lat: geoRes.data.lat, lon: geoRes.data.lon },
      name: geoRes.data.name || destination,
      state: geoRes.data.state?.name || ''
    };
    await setCache(geoCacheKey, locationInfo, 86400); // Cache for 1 day
    return locationInfo;
  }

  throw new Error(`Could not find coordinates for destination: ${destination}`);
}

//api fetching function
async function fetchAllApiData(destinationInfo, params) {
  const { startDate, endDate, origin, personalizedParams, apiLangCode } = params;
  const { coords: destinationCoords, name: destinationName } = destinationInfo;

  const [
    attractionsRes,
    accommodationRes,
    foodRes,
    weatherRes,
    unsplashRes,
    routeRes,
    eventsRes
  ] = await Promise.allSettled([
    retry(() => axios.get(GOOGLE_PLACES_BASE, { params: { location: `${destinationCoords.lat},${destinationCoords.lon}`, radius: 5000, ...personalizedParams, language: apiLangCode, key: GOOGLE_API_KEY } }), 'Google Places Attractions'),
    retry(() => axios.get(GOOGLE_PLACES_BASE, { params: { location: `${destinationCoords.lat},${destinationCoords.lon}`, radius: 5000, keyword: 'hotel|lodging', ...personalizedParams, language: apiLangCode, key: GOOGLE_API_KEY } }), 'Google Places Accommodations'),
    retry(() => axios.get(GOOGLE_PLACES_BASE, { params: { location: `${destinationCoords.lat},${destinationCoords.lon}`, radius: 5000, type: 'restaurant', keyword: 'restaurant|cafe|food', language: apiLangCode, key: GOOGLE_API_KEY } }), 'Google Places Food'),
    retry(() => axios.get(OPENWEATHER_BASE, { params: { lat: destinationCoords.lat, lon: destinationCoords.lon, appid: OPENWEATHER_API_KEY, units: 'metric' } }), 'OpenWeatherMap Forecast'),
    retry(() => axios.get(UNSPLASH_BASE, { params: { query: destinationName, per_page: 1, client_id: UNSPLASH_ACCESS_KEY } }), 'Unsplash Image'),
    getRouteData(origin, destinationCoords),
    fetchLocalEvents(destinationName, startDate, endDate)
  ]);

  return { attractionsRes, accommodationRes, foodRes, weatherRes, unsplashRes, routeRes, eventsRes };
}

function processAttractions(response) {
  if (response.status === 'fulfilled' && response.value.data?.results?.length > 0) {
    return response.value.data.results.slice(0, 10).map(g => ({
      name: g.name,
      description: `Rating: ${g.rating || 'N/A'} (${g.user_ratings_total || 0} reviews)`,
      photo_reference: g.photos ? g.photos[0].photo_reference : null,
      vicinity: g.vicinity
    }));
  }
  return [{ name: 'City Museum' }, { name: 'Local Park' }];
}


function processAccommodations(response) {
  if (response.status === 'fulfilled' && response.value.data?.results?.length > 0) {
    return response.value.data.results.slice(0, 5).map(place => ({
      name: place.name,
      rating: place.rating || 'N/A',
      vicinity: place.vicinity
    }));
  }
  return [];
}

function processFood(response) {
  if (response.status === 'fulfilled' && response.value.data?.results?.length > 0) {
    return response.value.data.results.slice(0, 8).map(g => ({
      name: g.name,
      description: `Rating: ${g.rating || 'N/A'} (${g.user_ratings_total || 0} reviews)`,
      photo_reference: g.photos ? g.photos[0].photo_reference : null,
      vicinity: g.vicinity
    }));
  }
  return [{ name: 'Local Café' }, { name: 'Street Food Corner' }];
}

function processWeather(response) {
  const forecast = [];
  if (response.status === 'fulfilled' && response.value.data?.list) {
    const daysMap = {};
    response.value.data.list.forEach(entry => {
      const dayString = entry.dt_txt.split(' ')[0];
      if (!daysMap[dayString]) {
        daysMap[dayString] = {
          date: dayString,
          temp: entry.main.temp,
          condition: entry.weather[0].description,
        };
      }
    });
    const uniqueDays = Object.values(daysMap).slice(0, 5);
    uniqueDays.forEach((dayData, index) => forecast.push({ day: index + 1, ...dayData }));
  }
  return { forecast: forecast.length > 0 ? forecast : [{ day: 1, date: 'N/A', temp: 'N/A', condition: 'No forecast available' }] };
}

function processCoverImage(response) {
  return (response.status === 'fulfilled' && response.value.data.results?.[0]?.urls?.regular)
    ? response.value.data.results[0].urls.regular
    : DEFAULT_IMAGE_URL;
}


function calculateTripBudget(params, route, attractions) {
  const { startDate, endDate, travelers, preferences, destinationName } = params;
  const { accommodationType } = preferences;

  const nights = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));

  const costTier = BUDGET_CONFIG.LOCATION_TIERS[destinationName] || BUDGET_CONFIG.LOCATION_TIERS['default'];
  const regionalCosts = BUDGET_CONFIG.ACCOMMODATION_COSTS[costTier];

  const accommodationCost = (regionalCosts[accommodationType] || regionalCosts.standard) * nights;
  const travelCost = route?.cheapest?.cost || 0;

  const foodCost = (BUDGET_CONFIG.FOOD_COSTS_PER_DAY[accommodationType] || BUDGET_CONFIG.FOOD_COSTS_PER_DAY.standard) * travelers * nights;

  const activityCost = attractions.length * BUDGET_CONFIG.ACTIVITY_COSTS.AVG_COST_PER_ATTRACTION_PERSON * travelers;

  const total = travelCost + accommodationCost + activityCost + foodCost;

  return {
    travel: travelCost,
    accommodation: accommodationCost,
    activities: activityCost,
    food: foodCost,
    total,
    breakdown: {
      nights,
      costTier,
      accommodationPerNight: regionalCosts[accommodationType] || regionalCosts.standard
    }
  };
}

/**
 * Builds a personalized API parameter object based on user preferences.
 * @param {object} preferences - The user's preferences object.
 * @returns {object} An object containing API parameters for Google Places.
 */
function buildPersonalizedApiParams(preferences = {}) {
  const personalizedParams = {};

  for (const key in PREFERENCE_TO_API_MAP) {
    const config = PREFERENCE_TO_API_MAP[key];
    const userValue = preferences[key];

    let apiValue;

    if (userValue && config.mappings) {
      apiValue = config.mappings[userValue];
    } else if (userValue) {
      apiValue = config.formatter ? config.formatter(userValue) : userValue;
    } else {
      apiValue = config.default;
    }

    if (apiValue) {
      if (personalizedParams[config.param]) {
        personalizedParams[config.param] += `|${apiValue}`;
      } else {
        personalizedParams[config.param] = apiValue;
      }
    }
  }

  return personalizedParams;
}

async function convertAllCosts(tripData, targetCurrency, currencyService) {
  const baseCurrency = 'INR';
  if (targetCurrency.toUpperCase() === baseCurrency) {
    tripData.budget.currency = baseCurrency;
    return tripData;
  }

  const safeConvert = async (amount) => {
    const result = await currencyService.convertCurrency(amount, baseCurrency, targetCurrency);
    return result ? result.convertedAmount : amount;
  };

  const budgetPromises = Object.keys(tripData.budget).map(async (key) => {
    if (typeof tripData.budget[key] === 'number') {
      tripData.budget[key] = await safeConvert(tripData.budget[key]);
    }
  });

  await Promise.all(budgetPromises);
  tripData.budget.currency = targetCurrency;

  if (tripData.routeInfo && tripData.routeInfo.details) {
    const routePromises = Object.values(tripData.routeInfo.details).map(async (mode) => {
      if (mode.cost) {
        mode.cost = await safeConvert(mode.cost);
      }
    });
    await Promise.all(routePromises);

    if (tripData.routeInfo.fastest?.cost) tripData.routeInfo.fastest.cost = await safeConvert(tripData.routeInfo.fastest.cost);
    if (tripData.routeInfo.cheapest?.cost) tripData.routeInfo.cheapest.cost = await safeConvert(tripData.routeInfo.cheapest.cost);
  }

  return tripData;
}

const aggregateTripData = async ({ destination, origin, startDate, endDate, travelers, preferences }) => {
  if (!destination || !startDate || !endDate) {
    throw new Error('Destination, startDate, and endDate are required');
  }

  try {
    const destinationInfo = await getGeocodedLocation(destination);
    const cacheKey = `v4:trip:${destinationInfo.name.replace(/\s+/g, '_')}:${startDate}:${endDate}:${travelers}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      logger.info(`✅ Returning cached trip for ${destinationInfo.name}`);
      return cached;
    }

    const { language = 'English' } = preferences;
    const apiLangCode = API_LANGUAGE_CODES[language.toLowerCase()] || 'en';
    const personalizedParams = buildPersonalizedApiParams(preferences);
    const apiParams = { startDate, endDate, origin, personalizedParams, destinationName: destinationInfo.name, apiLangCode };
    const apiResults = await fetchAllApiData(destinationInfo, apiParams);

    const attractions = processAttractions(apiResults.attractionsRes);
    // ... (processing for accommodations, food, weather, image remains the same) ...
    const coverImage = processCoverImage(apiResults.unsplashRes);
    const localEvents = apiResults.eventsRes.status === 'fulfilled' ? apiResults.eventsRes.value : [];

    // FIX: Removed the incorrect, unnecessary call to getRouteData.
    // We now ONLY use getDoorToDoorRoute for the main journey calculation.
    const routeInfo = await getDoorToDoorRoute(origin, destinationInfo.coords);

    const budget = calculateTripBudget({ ...apiParams, travelers, preferences }, routeInfo, attractions);
    const alerts = await fetchThreatAlertsForDestination(destinationInfo.name);

    let tripData = {
      destinationName: destinationInfo.name,
      origin,
      destinationCoords: destinationInfo.coords,
      startDate,
      endDate,
      travelers,
      preferences,
      attractions,
      foodRecommendations: processFood(apiResults.foodRes),
      accommodationSuggestions: processAccommodations(apiResults.accommodationRes),
      weather: processWeather(apiResults.weatherRes),
      coverImage,
      budget,
      alerts,
      localEvents,
      // FIX: Correctly and non-redundantly assign the routeInfo.
      routeInfo: routeInfo,
    };

    const { currency = 'USD' } = preferences;
    tripData = await convertAllCosts(tripData, currency, currencyService);

    await setCache(cacheKey, tripData, 600);
    logger.info(`✅ Trip data aggregated successfully for ${destinationInfo.name}`);
    return tripData;

  } catch (error) {
    logger.error('❌ Trip aggregation failed', { error: error.message, stack: error.stack });

    const userMessage = "We're sorry, but we couldn't create your trip plan at this moment as our systems are undergoing maintenance. 🛠️\n\nIf you'd like to report this issue directly to the developer, you can reach out here: https://www.linkedin.com/in/ankitsingh794/";

    const userFacingError = new Error('Failed to aggregate trip data');
    userFacingError.userMessage = userMessage;
    throw userFacingError;
  }
};

module.exports = { aggregateTripData };