const axios = require('axios');
const logger = require('../utils/logger');
const { setCache, getCache } = require('../config/redis');
const prompts = require('../config/promptLibrary');
const { get } = require('mongoose');
const Message = require('../models/Message');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODELS = (process.env.OPENROUTER_MODELS || 'mistralai/mistral-7b-instruct:free').split(',');
const CASUAL_CHAT_MODEL = process.env.CASUAL_CHAT_MODEL || 'mistralai/mistral-7b-instruct:free';
const FILTERING_MODEL = process.env.FILTERING_MODEL || 'mistralai/mistral-7b-instruct:free';



/**
 * ✅ ENHANCEMENT: Extracts all JSON code blocks from AI text
 */
function extractJsonBlocks(text) {
  if (!text || typeof text !== 'string') return [];
  const jsonBlocks = [];
  const regex = /```json([\s\S]*?)```/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const cleanJsonString = match[1]
        .trim()
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/[\u0000-\u001F]+/g, '');
      jsonBlocks.push(JSON.parse(cleanJsonString));
    } catch (err) {
      logger.warn('Failed to parse a JSON block from AI response:', err.message);
    }
  }
  return jsonBlocks;
}



/**
 * ✅ Validate itinerary structure
 */
function validateItinerary(itinerary) {
  if (!Array.isArray(itinerary) || itinerary.length === 0) return false;

  return itinerary.every(item => {
    if (typeof item !== 'object' || item === null) return false;
    if (typeof item.day !== 'number' || item.day <= 0) return false;
    if (typeof item.title !== 'string' || item.title.trim() === '') return false;
    return Array.isArray(item.activities);
  });
}


/**
 * ✅ Fallback itinerary generator
 */
const generateFallbackItinerary = (data) => {
  const { destinationName, startDate, endDate, attractions, weather } = data;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const itinerary = [];
  const attractionsList = attractions.slice(0, days * 2);
  let index = 0;
  for (let i = 1; i <= days; i++) {
    const dailyAttractions = [];
    for (let j = 0; j < 2 && index < attractionsList.length; j++) {
      dailyAttractions.push(attractionsList[index].name);
      index++;
    }
    itinerary.push({
      day: i,
      title: `Day ${i} in ${destinationName}`,
      activities: dailyAttractions.length ? dailyAttractions : ['Explore the local surroundings']
    });
  }
  const formattedText = `A simple fallback plan for ${destinationName}.`;
  const summary = `Trip to ${destinationName} from ${startDate} to ${endDate}.`;

  return {
    itinerary,
    formattedText,
    summary,
    tips: [],
    mustEats: [],
    highlights: [],
    packingChecklist: []
  };
};

function buildItineraryPrompt(aggregatedData) {
  const { budget, weather, language = 'English', ...rest } = aggregatedData;
  const weatherSummary = weather.forecast.map(f => `${f.date.split('-').slice(1).join('/')}: ${f.condition}, ${f.temp}°C`).join('; ');
  const budgetSummary = `Total: ${budget.currency} ${budget.total} (Travel: ${budget.travel}, Stay: ${budget.accommodation}, Activities: ${budget.activities}, Food: ${budget.food})`;
  const languageFullName = {
    'english': 'English', 'hindi': 'Hindi (written in Devanagari script)', 'bengali': 'Bengali (written in Bengali script)',
    'tamil': 'Tamil (written in Tamil script)', 'telugu': 'Telugu (written in Telugu script)', 'kannada': 'Kannada (written in Kannada script)',
    'marathi': 'Marathi (written in Devanagari script)', 'gujarati': 'Gujarati (written in Gujarati script)', 'malayalam': 'Malayalam (written in Malayalam script)',
    'punjabi': 'Punjabi (written in Gurmukhi script)',
  }[language.toLowerCase()] || 'English';

  const promptDetails = { ...rest, budgetSummary, weatherSummary, languageFullName, budget, weather, language };

  return prompts.structuredTravelPlanPrompt(promptDetails);
}


function parseAiResponse(aiContent, aggregatedData) {
  let jsonString = null;
  let match = aiContent.match(/```json([\s\S]*?)```/);
  if (match && match[1]) {
    jsonString = match[1].trim();
  }
  if (!jsonString) {
    logger.warn("AI did not use markdown block. Attempting lenient JSON search...");
    match = aiContent.match(/\{[\s\S]*\}/);
    if (match && match[0]) {
      jsonString = match[0].trim();
    }
  }

  if (!jsonString) {
    logger.warn('No valid JSON of any kind found in AI response. Using fallback.');
    return generateFallbackItinerary(aggregatedData);
  }

  try {
    const parsedJson = JSON.parse(jsonString);

    const isValid = validateItinerary(parsedJson.itinerary) && parsedJson.aiSummary;
    if (!isValid) {
      logger.warn('AI returned a JSON object with an invalid structure. Using fallback.');
      return generateFallbackItinerary(aggregatedData);
    }
    return {
      itinerary: parsedJson.itinerary,
      aiSummary: parsedJson.aiSummary
    };
  } catch (error) {
    logger.error('Failed to parse extracted JSON from AI response. Using fallback.', { error: error.message });
    return generateFallbackItinerary(aggregatedData);
  }
}

/**
 * Generates a full, personalized itinerary by calling the AI model.
 * Caches the result to improve performance and reduce costs.
 * @param {object} aggregatedData - The complete data object from tripService.
 * @returns {Promise<object>} The structured AI response.
 */

async function generateItinerary(aggregatedData) {
  if (!OPENROUTER_API_KEY) {
    logger.warn('OPENROUTER_API_KEY missing, using fallback itinerary.');
    return generateFallbackItinerary(aggregatedData);
  }
  const { destinationName, startDate, endDate, travelers, language = 'English' } = aggregatedData;
  const cacheKey = `v3:aiItinerary:${destinationName}:${startDate}:${endDate}:${travelers}:${language}`;
  const cachedData = await getCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const prompt = buildItineraryPrompt(aggregatedData);

  for (const model of OPENROUTER_MODELS) {
    try {
      logger.info(`Generating AI itinerary via OpenRouter using model: ${model.trim()}`);
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: model.trim(),
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: "json_object" }
        },
        { headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` }, timeout: 60000 }
      );
      const aiContent = response.data.choices[0].message.content || '';
      const result = parseAiResponse(aiContent, aggregatedData);
      if (validateItinerary(result.itinerary)) {
        await setCache(cacheKey, result, 1800);
        return result;
      }
      throw new Error('AI returned an invalid itinerary structure.');
    } catch (error) {
      logger.warn(`AI model ${model.trim()} failed: ${error.message}. Trying next model...`);
    }
  }
  logger.error('All AI models in the cascade failed. Using local fallback itinerary.');
  return generateFallbackItinerary(aggregatedData);
}




/**
 * Gets a conversational response from a simpler AI model for casual chat.
 * @param {string} userMessage - The user's message.
 * @param {Array} history - The recent chat history.
 * @returns {Promise<string>} The AI's text response.
 */
async function getCasualResponse(userMessage, history = []) {
  const systemInstructions = prompts.casualChatSystemPrompt;
  const allMessages = [...history, { role: 'user', content: userMessage }];
  let finalPrompt = [];

  if (CASUAL_CHAT_MODEL.includes('gemma')) {
    if (allMessages.length > 0) {
      const firstMessage = { ...allMessages[0] };
      firstMessage.content = `${systemInstructions}\n\n---\n\n${firstMessage.content}`;
      finalPrompt.push(firstMessage);
      finalPrompt.push(...allMessages.slice(1));
    }
  } else {
    finalPrompt = [
      { role: 'system', content: systemInstructions },
      ...allMessages
    ];
  }

  logger.info(`Attempting to call OpenRouter API for casual chat with model: ${CASUAL_CHAT_MODEL}`);
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: CASUAL_CHAT_MODEL,
        messages: finalPrompt,
      },
      {
        headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` },
        timeout: 10000
      }
    );
    const rawResponse = response.data.choices[0].message.content || "I'm not sure how to respond to that.";
    let cleanedResponse = rawResponse.trim();
    const tagMatch = cleanedResponse.match(/^<[^>]+>([\s\S]*)<\/[^>]+>$/);
    if (tagMatch && tagMatch[1]) {
      cleanedResponse = tagMatch[1].trim();
    }
    cleanedResponse = cleanedResponse.replace(/<begin_of_box>|<end_of_box>/g, '').trim();


    logger.info('Successfully received and cleaned response from OpenRouter API.');
    return cleanedResponse;
  } catch (error) {
    logger.error(`Casual chat AI call failed: ${error.message}`, { code: error.code, details: error.response?.data });
    return "I'm having a little trouble connecting right now. Please try again in a moment.";
  }
}



/**
 * Generates personalized justifications for a list of places based on a user's query.
 * @param {string} query The user's original search query.
 * @param {Array} places A list of place objects from Google Places.
 * @returns {Promise<object>} A map of place names to their AI-generated justifications.
 */
async function getAiJustifications(query, places) {
  const prompt = prompts.generatePlaceJustificationsPrompt(query, places);
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: FILTERING_MODEL,
        messages: [{ role: 'user', content: prompt }],
      },
      { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` }, timeout: 15000 }
    );
    const content = response.data.choices[0].message.content;
    const match = content.match(/\{[\s\S]*\}/);
    if (match && match[0]) {
      return JSON.parse(match[0]);
    }
    return {};
  } catch (error) {
    logger.error('getAiJustifications failed:', {
      message: error.message,
      modelUsed: FILTERING_MODEL,
      apiError: error.response?.data
    });
    return {};
  }
}

/**
 * Sends a list of trains to an AI to get intelligent recommendations.
 * @param {string} prompt The specialized prompt from the promptLibrary.
 * @returns {Promise<Array>} A curated list of recommended train options.
 */
async function getTrainRecommendations(prompt) {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: FILTERING_MODEL, // Use the fast model for this analysis
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" }
      },
      { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` }, timeout: 20000 }
    );
    const content = response.data.choices[0].message.content;
    const match = content.match(/\[[\s\S]*\]/); // Find the JSON array
    if (match && match[0]) {
      return JSON.parse(match[0]);
    }
    logger.warn('AI train recommendation returned no valid JSON array.');
    return [];
  } catch (error) {
    logger.error('getTrainRecommendations failed:', { errorMessage: error.message });
    return [];
  }
}


/**
 * Distills a conversational user query into 2-3 simple keywords for an API.
 * @param {string} conversationalQuery The user's full message.
 * @returns {Promise<string>} A simplified string of keywords.
 */
async function generateKeywordsForQuery(conversationalQuery) {
  const prompt = `You are an API assistant. Your task is to extract the 2-3 most important keywords from the user's search query for a travel API. Respond with ONLY the keywords.
    
    ### EXAMPLES:
    - User: "find the perfect place to take my girl on date she likes to have adventure"
    - AI: "adventurous romantic date spot"
    
    - User: "I'm looking for a quiet cafe with good wifi for working"
    - AI: "quiet cafe wifi"

    - User: "show me some family-friendly parks with playgrounds"
    - AI: "family-friendly park playground"

    ### USER QUERY:
    "${conversationalQuery}"

    ### KEYWORDS:`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: FILTERING_MODEL, 
        messages: [{ role: 'user', content: prompt }],
      }, { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } });
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    logger.error('Failed to generate keywords from query', { error: error.message });
    return conversationalQuery;
  }
}




module.exports = {
  generateItinerary,
  getCasualResponse,
  extractJsonBlocks,
  getAiJustifications,
  buildItineraryPrompt,
  getTrainRecommendations,
  parseAiResponse,
  generateKeywordsForQuery,
};