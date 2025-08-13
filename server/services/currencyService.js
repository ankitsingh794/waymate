const axios = require('axios');
const logger = require('../utils/logger');
const { getCache, setCache } = require('../config/redis');

const API_KEY = process.env.EXCHANGE_RATE_API_KEY;
const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}`;

/**
 * Fetches the latest exchange rates for a given base currency.
 * @param {string} baseCurrency The base currency code (e.g., 'INR').
 * @returns {Promise<object|null>} The conversion rates object or null on failure.
 */
async function getRates(baseCurrency = 'INR') {
  if (!API_KEY) {
    logger.warn('EXCHANGE_RATE_API_KEY is not set. Currency conversion is disabled.');
    return null;
  }

  const cacheKey = `currency-rates:${baseCurrency}`;
  const cachedRates = await getCache(cacheKey);

  if (cachedRates) {
    logger.info(`Returning cached currency rates for ${baseCurrency}`);
    return cachedRates;
  }

  try {
    logger.info(`Fetching latest currency rates for ${baseCurrency} from API.`);
    const response = await axios.get(`${BASE_URL}/latest/${baseCurrency}`);
    const rates = response.data?.conversion_rates;

    if (rates) {
      await setCache(cacheKey, rates, 43200);
      return rates;
    }
    return null;
  } catch (error) {
    logger.error(`Failed to fetch exchange rates: ${error.message}`);
    return null;
  }
}

/**
 * Converts an amount from a source currency to a target currency.
 * @param {number} amount The amount to convert.
 * @param {string} fromCurrency The source currency code (e.g., 'INR').
 * @param {string} toCurrency The target currency code (e.g., 'USD').
 * @returns {Promise<object|null>} An object with the converted amount and rate, or null on failure.
 */
async function convertCurrency(amount, fromCurrency, toCurrency) {
  const rates = await getRates(fromCurrency);

  if (!rates || !rates[toCurrency]) {
    logger.warn(`Conversion rate from ${fromCurrency} to ${toCurrency} not available.`);
    return null;
  }

  const rate = rates[toCurrency];
  const convertedAmount = amount * rate;

  return {
    originalAmount: amount,
    convertedAmount: parseFloat(convertedAmount.toFixed(2)),
    from: fromCurrency,
    to: toCurrency,
    rate: rate,
  };
}

module.exports = {
  convertCurrency,
  getRates,
};