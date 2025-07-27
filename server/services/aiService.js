const axios = require('axios');
const logger = require('../utils/logger');
const { setCache, getCache } = require('../config/redis');
const prompts = require('../config/promptLibrary'); // Import the new prompt library

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3-70b-instruct';
const CASUAL_CHAT_MODEL = process.env.CASUAL_CHAT_MODEL || 'mistralai/mistral-7b-instruct:free';


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
      // Clean the JSON string before parsing
      const cleanJsonString = match[1]
        .trim()
        .replace(/,\s*([\]}])/g, '$1') // Remove trailing commas
        .replace(/[\u0000-\u001F]+/g, ''); // Remove control characters
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

  const weatherSummary = weather.forecast
    .map(f => `${f.date.split('-').slice(1).join('/')}: ${f.condition}, ${f.temp}°C`)
    .join('; ');

  const budgetSummary = `Total: ${budget.currency} ${budget.total} (Travel: ${budget.travel}, Stay: ${budget.accommodation}, Activities: ${budget.activities}, Food: ${budget.food})`;

  const languageFullName = {
    'english': 'English',
    'hindi': 'Hindi (written in Devanagari script)',
    'bengali': 'Bengali (written in Bengali script)',
    'tamil': 'Tamil (written in Tamil script)',
    'telugu': 'Telugu (written in Telugu script)',
    'kannada': 'Kannada (written in Kannada script)',
    'marathi': 'Marathi (written in Devanagari script)',
    'gujarati': 'Gujarati (written in Gujarati script)',
    'malayalam': 'Malayalam (written in Malayalam script)',
    'punjabi': 'Punjabi (written in Gurmukhi script)',
  }[language.toLowerCase()] || 'English';

  const promptDetails = { ...rest, budgetSummary, weatherSummary, languageFullName, budget, weather, language };

  return prompts.generateItineraryPrompt(promptDetails);
}

function parseAiResponse(aiContent, aggregatedData) {
    // 1. Find the single JSON block in the AI's response.
    const match = aiContent.match(/```json([\s\S]*?)```/);
    if (!match || !match[1]) {
        logger.warn('No valid JSON block found in AI response. Using fallback.');
        return generateFallbackItinerary(aggregatedData);
    }

    try {
        // 2. Parse the extracted JSON string.
        const parsedJson = JSON.parse(match[1].trim());

        // 3. Validate the structure of the parsed JSON.
        const isValid = validateItinerary(parsedJson.itinerary) && parsedJson.aiSummary;
        if (!isValid) {
            logger.warn('AI returned a JSON object with an invalid structure. Using fallback.');
            return generateFallbackItinerary(aggregatedData);
        }
        
        return {
            itinerary: parsedJson.itinerary,
            aiSummary: parsedJson.aiSummary,
            tips: parsedJson.aiSummary.tips || [],
            mustEats: parsedJson.aiSummary.mustEats || [],
            highlights: parsedJson.aiSummary.highlights || [],
            packingChecklist: parsedJson.aiSummary.packingChecklist || [],
            formattedText: parsedJson.aiSummary.overview || "No summary provided."
        };

    } catch (error) {
        logger.error('Failed to parse JSON from AI response. Using fallback.', { error: error.message });
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
        logger.info(`AI itinerary fetched from cache for ${destinationName}`);
        return cachedData;
    }

    try {
        logger.info('Generating AI itinerary via OpenRouter...');
        const prompt = buildItineraryPrompt(aggregatedData);

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: OPENROUTER_MODEL,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: "json_object" } 
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 60000
            }
        );
        
        const aiContent = response.data.choices[0].message.content || '';
        const result = parseAiResponse(aiContent, aggregatedData);

        if (validateItinerary(result.itinerary)) {
            await setCache(cacheKey, result, 1800); // Cache for 30 minutes
        }
        return result;

    } catch (error) {
        logger.error('AI service failed, using fallback.', { error: error.message });
        return generateFallbackItinerary(aggregatedData);
    }
}

/**
 * Gets a conversational response from a simpler AI model for casual chat.
 * @param {string} userMessage - The user's message.
 * @param {Array} history - The recent chat history.
 * @returns {Promise<string>} The AI's text response.
 */
async function getCasualResponse(userMessage, history = []) {
  const prompt = [
    {
      role: 'system',
      content: prompts.casualChatSystemPrompt 
    },
    ...history,
    { role: 'user', content: userMessage }
  ];

  logger.info('Attempting to call OpenRouter API for casual chat...');
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: CASUAL_CHAT_MODEL,
        messages: prompt,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000 
      }
    );
    logger.info('Successfully received response from OpenRouter API.');
    return response.data.choices[0].message.content || "I'm not sure how to respond to that. Can you ask another way?";
  } catch (error) {
    logger.error(`Casual chat AI call failed: ${error.message}`, { code: error.code, details: error.response?.data });
    return "I'm having a little trouble connecting right now. Please try again in a moment!";
  }
}


/**
 * Gets a contextual AI response for a one-on-one AI chat session.
 * @param {string} sessionId - The ID of the chat session.
 * @param {string} userId - The ID of the user sending the message.
 * @param {string} text - The user's message.
 * @returns {Promise<object>} The saved and populated AI message object.
 */
const getAiResponse = async (sessionId, userId, text) => {
  const history = await Message.find({ chatSession: sessionId }).sort({ createdAt: -1 }).limit(10);

  const aiText = await getCasualResponse(text, history);
  const aiMessage = new Message({
    chatSession: sessionId,
    sender: null, 
    text: aiText,
    type: 'ai',
  });
  await aiMessage.save();

  return aiMessage;
};


/**
 * Gets a structured JSON response from a complex prompt using the main AI model.
 * @param {string} prompt The detailed prompt for the AI.
 * @returns {Promise<object>} The parsed JSON object from the AI's response.
 */
async function getFilteredResponse(prompt) {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: OPENROUTER_MODEL, // Use your powerful model for this reasoning task
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" }
    },
    { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } }
  );
  const content = JSON.parse(response.data.choices[0].message.content);
  const key = Object.keys(content)[0];
  return content[key] || content;
}

module.exports = {
  generateItinerary,
  getCasualResponse,
  getAiResponse,
  extractJsonBlocks,
  getFilteredResponse,
};