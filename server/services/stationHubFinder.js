const axios = require('axios');
const logger = require('../utils/logger');
const { GOOGLE_PLACES_BASE, GOOGLE_DISTANCE_MATRIX_BASE, GOOGLE_API_KEY } = require('../config/apiConfig');

/**
 * Finds the nearest train stations to a given location using Google Places + Distance Matrix.
 * @param {object} originCoords - { lat, lon }
 * @param {number} limit - max number of stations to return (default 3)
 * @returns {Promise<Array>} - List of nearest stations with travel details
 */
async function findNearestTrainStations(originCoords, limit = 3) {
  try {
    const placesResponse = await axios.get(GOOGLE_PLACES_BASE, {
      params: {
        location: `${originCoords.lat},${originCoords.lon}`,
        rankby: 'distance',
        type: 'train_station',
        key: GOOGLE_API_KEY
      }
    });

    const candidateStations = placesResponse.data.results.slice(0, limit);
    if (candidateStations.length === 0) {
      logger.warn(`No train stations found near ${originCoords.lat},${originCoords.lon}`);
      return [];
    }

    // 2. Build destinations param for Distance Matrix
    const destinationParams = candidateStations
      .map(s => `${s.geometry.location.lat},${s.geometry.location.lng}`)
      .join('|');

    const matrixResponse = await axios.get(GOOGLE_DISTANCE_MATRIX_BASE, {
      params: {
        origins: `${originCoords.lat},${originCoords.lon}`,
        destinations: destinationParams,
        departure_time: 'now',
        key: GOOGLE_API_KEY
      }
    });

    // 3. Combine Places + Distance Matrix data
    const stations = [];
    matrixResponse.data.rows[0].elements.forEach((element, index) => {
      if (element.status === 'OK') {
        const station = candidateStations[index];
        stations.push({
          name: station.name,
          coords: {
            lat: station.geometry.location.lat,
            lon: station.geometry.location.lng
          },
          distanceText: element.distance.text,
          distanceValue: element.distance.value, 
          durationText: element.duration_in_traffic?.text || element.duration.text,
          durationValue: element.duration_in_traffic?.value || element.duration.value, 
          costEstimate: Math.round((element.distance.value / 1000) * 20) 
        });
      }
    });
    stations.sort((a, b) => a.durationValue - b.durationValue);

    logger.info(`Found ${stations.length} nearest train stations for origin: ${originCoords.lat},${originCoords.lon}`);
    return stations;

  } catch (error) {
    logger.error('Error in findNearestTrainStations', { message: error.message });
    return [];
  }
}

module.exports = { findNearestTrainStations };
