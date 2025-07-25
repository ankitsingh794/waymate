// C:\Project\webdev\idk\WayMate\server\config\apiConfig.js

require('dotenv').config();

module.exports = {
  // Mapbox Configuration
  MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,
  MAPBOX_DIRECTIONS_BASE: 'https://api.mapbox.com/directions/v5/mapbox',
  MAPBOX_STATIC_BASE: 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static',

  // Google Cloud Platform Configuration
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  GOOGLE_PLACES_BASE: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
  GOOGLE_GEOCODING_BASE: 'https://maps.googleapis.com/maps/api/geocode/json',

  // OpenTripMap Configuration
  OPENTRIPMAP_API_KEY: process.env.OPENTRIPMAP_API_KEY,
  OPENTRIPMAP_BASE: 'https://api.opentripmap.com/0.1/en/places',

  // Unsplash Configuration
  UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY,
  UNSPLASH_BASE: 'https://api.unsplash.com/search/photos',

  // OpenWeatherMap Configuration
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
  OPENWEATHER_BASE: 'https://api.openweathermap.org/data/2.5/forecast',

  // API Usage Limits (can be adjusted)
  LIMITS: {
    mapboxDirections: 100000, // Monthly limit
    staticImages: 50000,     // Monthly limit
  },
  
  // Redis keys for tracking API usage
  MAPBOX_DIRECTIONS_KEY: 'usage:mapbox:directions',
  MAPBOX_STATIC_KEY: 'usage:mapbox:static',
};