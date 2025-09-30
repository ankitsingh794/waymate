const axios = require('axios');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { setCache, getCache, incrCache } = require('../config/redis');
const { fetchThreatAlertsForDestination } = require('./alertService');
const { fetchLocalEvents } = require('./eventService');
const currencyService = require('./currencyService');
const { BUDGET_CONFIG } = require('../config/budgetConfig');

const {
  GOOGLE_API_KEY,
  OPENWEATHER_API_KEY,
  UNSPLASH_ACCESS_KEY,
  GOOGLE_PLACES_BASE,
  OPENWEATHER_BASE,
  UNSPLASH_BASE,
  GOOGLE_GEOCODING_BASE,
  GOOGLE_DISTANCE_MATRIX_BASE,
} = require('../config/apiConfig');

// --- UTILITY & HELPER FUNCTIONS ---

/**
 * Retry wrapper for resilient API calls.
 */
async function retry(fn, description = 'API call', retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isNetworkError = !err.response;
      const isServerError = err.response?.status >= 500;
      logger.warn(`${description} failed (attempt ${attempt + 1}): ${err.message}`);
      if (!(isNetworkError || isServerError) || attempt === retries) {
        break;
      }
      await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

/**
 * Calculates Haversine distance between two coordinates.
 * @returns {number} Distance in kilometers.
 */
const haversineDistance = (coords1, coords2) => {
  const R = 6371; // Radius of Earth in km
  const dLat = (coords2.lat - coords1.lat) * (Math.PI / 180);
  const dLon = (coords2.lon - coords1.lon) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(coords1.lat * (Math.PI / 180)) * Math.cos(coords2.lat * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

/**
 * Returns a Google Places photo URL from a photo reference.
 */
const getGooglePhotoUrl = (photoRef) => {
  if (!photoRef) return null;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${GOOGLE_API_KEY}`;
};


// --- CORE LOGIC: DATA FETCHING & PROCESSING ---

/**
 * [FIXED] Fetches geocoded location using the reliable Google Geocoding API.
 */
async function getGeocodedLocation(destination) {
  const geoCacheKey = `google-geo:${destination.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = await getCache(geoCacheKey);
  if (cached) {
    logger.info(`Returning cached Google geocode for: ${destination}`);
    return cached;
  }

  logger.info(`Fetching coordinates for "${destination}" via Google Geocoding API.`);
  try {
    const response = await retry(() => axios.get(GOOGLE_GEOCODING_BASE, {
      params: { address: destination, key: GOOGLE_API_KEY, components: 'country:IN' }
    }), 'Google Geocoding');

    if (response.data.status === 'ZERO_RESULTS' || !response.data.results[0]) {
      throw new AppError(`Could not find coordinates for destination: ${destination}`, 404);
    }

    const result = response.data.results[0];
    const locationInfo = {
      coords: { lat: result.geometry.location.lat, lon: result.geometry.location.lng },
      name: result.formatted_address,
      state: result.address_components.find(c => c.types.includes('administrative_area_level_1'))?.long_name || ''
    };
    await setCache(geoCacheKey, locationInfo, 86400); // Cache for 1 day
    return locationInfo;
  } catch (error) {
    if (error.isOperational) throw error;
    logger.error(`Google Geocoding API call failed for "${destination}"`, { message: error.message });
    throw new AppError('Failed to retrieve location data.', 500);
  }
}

/**
 * Finds the fastest transportation hub (airport, train station) from a user's location.
 */
async function findFastestHub(originCoords, hubType) {
  try {
    const placesResponse = await axios.get(GOOGLE_PLACES_BASE, { params: { location: `${originCoords.lat},${originCoords.lon}`, rankby: 'distance', type: hubType, key: GOOGLE_API_KEY } });
    const candidateHubs = placesResponse.data.results.slice(0, 3);
    if (candidateHubs.length === 0) return null;

    const destinationParams = candidateHubs.map(h => `${h.geometry.location.lat},${h.geometry.location.lng}`).join('|');
    const matrixResponse = await axios.get(GOOGLE_DISTANCE_MATRIX_BASE, { params: { origins: `${originCoords.lat},${originCoords.lon}`, destinations: destinationParams, departure_time: 'now', key: GOOGLE_API_KEY } });

    let fastestLeg = null, shortestDuration = Infinity;
    matrixResponse.data.rows[0].elements.forEach((element, index) => {
      if (element.status === 'OK' && element.duration?.value < shortestDuration) {
        shortestDuration = element.duration.value;
        const bestHub = candidateHubs[index];
        fastestLeg = {
          hub: { name: bestHub.name, coords: { lat: bestHub.geometry.location.lat, lon: bestHub.geometry.location.lng } },
          travel: { durationValue: element.duration.value, durationText: element.duration.text, distanceText: element.distance.text, cost: Math.round((element.distance.value / 1000) * 12) }
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
 * [REFINED] The main orchestrator for door-to-door route calculations.
 */
async function getDoorToDoorRoute(originCoords, destinationCoords) {
  const travelOptions = {};

  const [originAirport, destAirport, originTrain, destTrain] = await Promise.all([
    findFastestHub(originCoords, 'airport'),
    findFastestHub(destinationCoords, 'airport'),
    findFastestHub(originCoords, 'train_station'),
    findFastestHub(destinationCoords, 'train_station')
  ]);

  if (originAirport && destAirport) {
    const mainFlightLeg = estimateMainLeg(originAirport.hub, destAirport.hub, 'flight');
    const totalDurationSec = originAirport.travel.durationValue + mainFlightLeg.durationValue + destAirport.travel.durationValue;
    const totalCost = originAirport.travel.cost + mainFlightLeg.cost + destAirport.travel.cost;
    travelOptions.flight = { mode: 'Flight', durationValue: totalDurationSec, durationText: `${Math.round(totalDurationSec / 3600)}h total`, cost: totalCost, details: `Fly from ${originAirport.hub.name} to ${destAirport.hub.name}.` };
  }

  if (originTrain && destTrain) {
    const mainTrainLeg = estimateMainLeg(originTrain.hub, destTrain.hub, 'train');
    const totalDurationSec = originTrain.travel.durationValue + mainTrainLeg.durationValue + destTrain.travel.durationValue;
    const totalCost = originTrain.travel.cost + mainTrainLeg.cost + destTrain.travel.cost;
    travelOptions.train = { mode: 'Train', durationValue: totalDurationSec, durationText: `${Math.round(totalDurationSec / 3600)}h total`, cost: totalCost, details: `Train from ${originTrain.hub.name} to ${destTrain.hub.name}.` };
  }

  const finalOptions = Object.values(travelOptions);
  if (finalOptions.length === 0) return { fastest: { mode: 'N/A' }, cheapest: { mode: 'N/A' }, details: {} };

  const fastest = finalOptions.reduce((a, b) => a.durationValue < b.durationValue ? a : b);
  const cheapest = finalOptions.reduce((a, b) => a.cost < b.cost ? a : b);
  return { fastest, cheapest, details: travelOptions };
}

/**
 * Processes Google Places API responses, returning an empty array on failure.
 */
function processPlaces(response, placeType) {
  if (response.status === 'fulfilled' && response.value.data?.results?.length > 0) {
    return response.value.data.results.map(p => ({
      name: p.name,
      rating: p.rating || 0,
      image: getGooglePhotoUrl(p.photos?.[0]?.photo_reference),
      vicinity: p.vicinity,
      coords: p.geometry && p.geometry.location ? {
        lat: p.geometry.location.lat,
        lon: p.geometry.location.lng
      } : undefined,
    })).slice(0, placeType === 'lodging' ? 5 : 10);
  }
  logger.warn(`No results or failed response for place type: ${placeType}`);
  return []; // Return empty array instead of fake data
}

/**
 * Processes OpenWeatherMap API response.
 */
function processWeather(response) {
  if (response.status === 'fulfilled' && response.value.data?.list) {
    const daysMap = {};
    response.value.data.list.forEach(entry => {
      const dayString = entry.dt_txt.split(' ')[0];
      if (!daysMap[dayString]) {
        daysMap[dayString] = { date: dayString, temp: entry.main.temp, condition: entry.weather[0].description };
      }
    });
    const uniqueDays = Object.values(daysMap).slice(0, 5);
    return { forecast: uniqueDays.map((dayData, index) => ({ day: index + 1, ...dayData })) };
  }
  return { forecast: [] };
}

/**
 * Calculates the trip budget based on aggregated data.
 */
function calculateTripBudget({ startDate, endDate, travelers, preferences, destinationName }, route, attractions) {
  const nights = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
  const costTier = BUDGET_CONFIG.LOCATION_TIERS[destinationName] || BUDGET_CONFIG.LOCATION_TIERS['default'];
  const regionalCosts = BUDGET_CONFIG.ACCOMMODATION_COSTS[costTier];
  const accommodationType = preferences.accommodationType || 'standard';

  const accommodationCost = (regionalCosts[accommodationType] || regionalCosts.standard) * nights;
  const travelCost = route?.cheapest?.cost || 0;
  const foodCost = (BUDGET_CONFIG.FOOD_COSTS_PER_DAY[accommodationType] || BUDGET_CONFIG.FOOD_COSTS_PER_DAY.standard) * travelers * nights;
  const activityCost = attractions.length * BUDGET_CONFIG.ACTIVITY_COSTS.AVG_COST_PER_ATTRACTION_PERSON * travelers;

  return { total: travelCost + accommodationCost + activityCost + foodCost, travel: travelCost, accommodation: accommodationCost, activities: activityCost, food: foodCost };
}

/**
 * A robust function to convert all monetary values in a trip data object to a target currency.
 * It fetches the conversion rate once and applies it to all relevant fields.
 * @param {object} tripData - The aggregated trip data object with costs in INR.
 * @param {string} targetCurrency - The user's desired currency code (e.g., 'USD').
 * @returns {Promise<object>} The trip data object with all costs converted.
 */
async function convertAllCosts(tripData, targetCurrency) {
  const baseCurrency = 'INR'; // All internal calculations are in INR

  // If the target is the same as the base, no conversion is needed.
  if (!targetCurrency || targetCurrency.toUpperCase() === baseCurrency) {
    tripData.budget.currency = baseCurrency;
    return tripData;
  }

  // Fetch the conversion rates for INR once to be efficient.
  const rates = await currencyService.getRates(baseCurrency);
  const rate = rates ? rates[targetCurrency.toUpperCase()] : null;

  // If the rate is unavailable, return the data without conversion but log a warning.
  if (!rate) {
    logger.warn(`Currency conversion rate from INR to ${targetCurrency} not available. Returning costs in INR.`);
    tripData.budget.currency = baseCurrency;
    return tripData;
  }

  // Helper to safely convert an amount.
  const convert = (amount) => parseFloat((amount * rate).toFixed(2));

  // Convert all fields within the budget object.
  if (tripData.budget) {
    tripData.budget.total = convert(tripData.budget.total);
    tripData.budget.travel = convert(tripData.budget.travel);
    tripData.budget.accommodation = convert(tripData.budget.accommodation);
    tripData.budget.activities = convert(tripData.budget.activities);
    tripData.budget.food = convert(tripData.budget.food);
  }

  // Convert all costs within the routeInfo object.
  if (tripData.routeInfo?.details) {
    for (const mode in tripData.routeInfo.details) {
      if (tripData.routeInfo.details[mode].cost) {
        tripData.routeInfo.details[mode].cost = convert(tripData.routeInfo.details[mode].cost);
      }
    }
    if (tripData.routeInfo.fastest?.cost) {
      tripData.routeInfo.fastest.cost = convert(tripData.routeInfo.fastest.cost);
    }
    if (tripData.routeInfo.cheapest?.cost) {
      tripData.routeInfo.cheapest.cost = convert(tripData.routeInfo.cheapest.cost);
    }
  }

  tripData.budget.currency = targetCurrency.toUpperCase();

  return tripData;
}


// --- MAIN AGGREGATOR FUNCTION ---

const aggregateTripData = async ({ destination, origin, startDate, endDate, travelers, preferences }) => {
  try {
    const destinationInfo = await getGeocodedLocation(destination);
    const cacheKey = `v5:trip:${destinationInfo.name.replace(/\s+/g, '_')}:${startDate}:${endDate}:${travelers}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      logger.info(`✅ Returning cached trip for ${destinationInfo.name}`);
      return cached;
    }

    const [apiResults, routeInfo, alerts, localEvents] = await Promise.all([
      // Batch API calls for places
      Promise.allSettled([
        retry(() => axios.get(GOOGLE_PLACES_BASE, { params: { location: `${destinationInfo.coords.lat},${destinationInfo.coords.lon}`, radius: 5000, type: 'tourist_attraction', key: GOOGLE_API_KEY } }), 'Google Places Attractions'),
        retry(() => axios.get(GOOGLE_PLACES_BASE, { params: { location: `${destinationInfo.coords.lat},${destinationInfo.coords.lon}`, radius: 5000, type: 'lodging', keyword: (preferences.accommodationType || 'standard') + ' hotel', key: GOOGLE_API_KEY } }), 'Google Places Accommodations'),
        retry(() => axios.get(GOOGLE_PLACES_BASE, { params: { location: `${destinationInfo.coords.lat},${destinationInfo.coords.lon}`, radius: 5000, type: 'restaurant', key: GOOGLE_API_KEY } }), 'Google Places Food'),
        retry(() => axios.get(OPENWEATHER_BASE, { params: { lat: destinationInfo.coords.lat, lon: destinationInfo.coords.lon, appid: OPENWEATHER_API_KEY, units: 'metric' } }), 'OpenWeatherMap'),
        retry(() => axios.get(UNSPLASH_BASE, { params: { query: destinationInfo.name, per_page: 1, client_id: UNSPLASH_ACCESS_KEY } }), 'Unsplash Image'),
      ]),
      // [REFINED] Call the single, correct routing function
      getDoorToDoorRoute(origin, destinationInfo.coords),
      fetchThreatAlertsForDestination(destinationInfo.name),
      fetchLocalEvents(destinationInfo.name, startDate, endDate),
    ]);

    const [attractionsRes, accommodationRes, foodRes, weatherRes, unsplashRes] = apiResults;
    const attractions = processPlaces(attractionsRes, 'tourist_attraction');
    const budget = calculateTripBudget({ startDate, endDate, travelers, preferences, destinationName: destinationInfo.name }, routeInfo, attractions);

    let tripData = {
      destinationName: destinationInfo.name, origin, destinationCoords: destinationInfo.coords, startDate, endDate, travelers, preferences,
      attractions,
      foodRecommendations: processPlaces(foodRes, 'restaurant'),
      accommodationSuggestions: processPlaces(accommodationRes, 'lodging'),
      weather: processWeather(weatherRes),
      coverImage: unsplashRes.status === 'fulfilled' ? unsplashRes.value.data.results?.[0]?.urls?.regular : null,
      budget, alerts, localEvents, routeInfo
    };

    const { currency = 'INR' } = preferences;
    tripData = await convertAllCosts(tripData, currency);

    await setCache(cacheKey, tripData, 1800);
    logger.info(`✅ Trip data aggregated successfully for ${destinationInfo.name}`);
    return tripData;

  } catch (error) {
    logger.error('❌ Trip aggregation failed', { error: error.message, stack: error.stack });
    // [REFINED] Throw a professional, user-safe error
    if (error.isOperational) throw error;
    throw new AppError('We are currently unable to create your trip plan. Please try again later.', 503);
  }
};


/**
 * Processes a batch of trips from an offline client, creating new ones
 * and updating existing ones within a single atomic transaction.
 * @param {object} user - The authenticated user object.
 * @param {Array<object>} trips - The array of trip data from the client.
 * @returns {Promise<object>} A map of client IDs to their new server-generated _ids.
 */
const processTripSync = async (user, trips) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const idMap = {}; // To map client IDs to new server IDs

  try {
    for (const tripData of trips) {
      if (tripData.clientId) {
        // This is a NEW trip created offline
        const { clientId, ...newTripData } = tripData;
        newTripData.group = { members: [{ userId: user._id, role: 'owner' }] };

        const [createdTrip] = await trips.create([newTripData], { session });
        idMap[clientId] = createdTrip._id;
        logger.info(`Synced new offline trip ${createdTrip._id} for user ${user.email}`);

      } else if (tripData._id) {
        // This is an UPDATE to an existing trip
        const { _id, ...updatedTripData } = tripData;

        // Ensure the user has permission to edit this trip
        const existingTrip = await trips.findOne({ _id, 'group.members.userId': user._id }).session(session);

        if (existingTrip) {
          Object.assign(existingTrip, updatedTripData);
          await existingTrip.save({ session });
          logger.info(`Synced updates for existing trip ${_id} for user ${user.email}`);
        } else {
          logger.warn(`User ${user.email} attempted to sync trip ${_id} but has no permission.`);
        }
      }
    }

    await session.commitTransaction();
    return idMap;

  } catch (error) {
    await session.abortTransaction();
    logger.error('Error during offline trip sync transaction.', { error: error.message, userId: user._id });
    throw new AppError('Failed to sync offline data. Please try again.', 500);
  } finally {
    session.endSession();
  }
};

/**
 * Generates a simple, template-based itinerary for non-leisure trips.
 * This function does NOT call an external AI and is therefore very fast.
 * @param {object} aggregatedData - The complete data object.
 * @returns {object} A structured object containing a simple itinerary and summary.
 */
const generateTemplateItinerary = (aggregatedData) => {
  const { destinationName, startDate, endDate, purpose } = aggregatedData;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const purposeTitle = purpose.charAt(0).toUpperCase() + purpose.slice(1);

  const itinerary = [];
  let sequence = 0;
  for (let i = 1; i <= days; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i - 1);
    
    // Morning Activity
    itinerary.push({
      sequence: sequence++,
      type: 'activity',
      activityPurpose: purpose,
      description: `Morning: Scheduled ${purpose} activities for Day ${i}.`,
      startTime: new Date(currentDate.setHours(9, 0, 0, 0)).toISOString()
    });
    // Afternoon Activity
    itinerary.push({
      sequence: sequence++,
      type: 'activity',
      activityPurpose: purpose,
      description: `Afternoon: Continue ${purpose} commitments.`,
      startTime: new Date(currentDate.setHours(14, 0, 0, 0)).toISOString()
    });
  }

  return {
    itinerary,
    aiSummary: {
      overview: `This is a structured plan for your ${purpose} trip to ${destinationName}.`,
      highlights: [`Focus on your primary objectives for the trip.`],
      tips: ["Prepare all necessary documents and materials.", "Confirm meeting times and locations in advance."],
      mustEats: [],
      packingChecklist: ["Laptop/Charger", "Business Attire", "Notebook and Pen"]
    }
  };
};

module.exports = { aggregateTripData, processTripSync, generateTemplateItinerary, convertAllCosts };