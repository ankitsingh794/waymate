const axios = require('axios');
const logger = require('../utils/logger');
const { setCache, getCache } = require('../config/redis');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3-70b-instruct';
const CASUAL_CHAT_MODEL = process.env.CASUAL_CHAT_MODEL || 'mistralai/mistral-7b-instruct:free';


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
 * ✅ Detects the user's intent from a message using AI parsing.
 * @param {string} userMessage The user's message to analyze.
 * @returns {Promise<object>} The detected intent and any relevant details.
 * */
async function getCasualResponse(userMessage, history = []) {
  const prompt = [
    {
      role: 'system',
      content: 'You are WayMate, a friendly, enthusiastic, and helpful AI travel assistant. Keep your responses concise, fun, and use emojis where appropriate. Do not answer questions unrelated to travel.'
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
          // ✅ ADDING A USER-AGENT HEADER
          'User-Agent': 'Node.js-WayMate-Client/1.0'
        },
        timeout: 10000 // Fail after 10 seconds
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
 * ✅ Generate AI itinerary using OpenRouter
 */
async function generateItinerary(aggregatedData) {
  if (!OPENROUTER_API_KEY) {
    logger.warn('OPENROUTER_API_KEY missing, using fallback itinerary.');
    return generateFallbackItinerary(aggregatedData);
  }

  const {
    destinationName,
    startDate,
    endDate,
    travelers,
    weather,
    attractions,
    route,
    budget, // Now a structured object
    alerts,
    localEvents, // New field for local events
    language = 'English',
    preferences
  } = aggregatedData;

  const cacheKey = `v2:aiItinerary:${destinationName}:${startDate}:${endDate}:${travelers}:${language || 'English'}`;

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


  const cachedData = await getCache(cacheKey);
  if (cachedData) {
    logger.info(`AI itinerary fetched from cache for ${destinationName}`);
    return cachedData;
  }

  try {
    logger.info('Generating AI itinerary via OpenRouter...');

    // ✅ ENHANCEMENT: Create richer summaries for the prompt
    const weatherSummary = weather.forecast
      .map(f => `${f.date.split('-').slice(1).join('/')}: ${f.condition}, ${f.temp}°C`)
      .join('; ');
    const budgetSummary = `Total: $${budget.total} (Travel: $${budget.travel}, Stay: $${budget.accommodation}, Activities: $${budget.activities}, Food: $${budget.food})`;

    const prompt = `
You are **WayMate**, a passionate and super-friendly AI Travel Assistant and storyteller. Your job: create an exciting, **personalized travel plan** that feels like a text from a travel-savvy friend—but also returns structured data for the app.

---

### 🛠 Task:
Using the provided details, produce:
1. **Engaging narrative with emojis**.
2. **Valid JSON structures for itinerary, tips, budget, etc.**.
3. Keep it accurate and fun.

---

### ✏️ Given Details:
- **Destination:** ${destinationName}
- **Travel Dates:** ${startDate} to ${endDate}
- **Travelers:** ${travelers}
- **Preferences:** Transport = ${preferences?.transportMode || 'any'}, Stay = ${preferences?.accommodationType || 'standard'}
- **Weather Forecast:** ${weatherSummary}
- **Estimated Budget:** ${budgetSummary}
- **Important Alerts:** ${alerts.length ? alerts.join(', ') : 'No alerts'}
- **Recommended Attractions:** ${attractions.map(a => a.name).join(', ')}
- **Routes:** ${JSON.stringify(route)}
- **Local Events Happening:** ${localEvents.length > 0 ? localEvents.map(e => `${e.title} on ${e.date}`).join('; ') : 'No specific events found.'}
-  **Language for entire response:** ${languageFullName}

---

### ✅ Special Advisory:
If the weather or alerts indicate unfavorable conditions (e.g., storms, heavy rain, travel advisories), **please include a friendly travel advisory** such as:
- "The current conditions aren't ideal for visiting — consider postponing your trip if possible."
- "Travel is only recommended if absolutely necessary due to weather/alerts."
- "You might want to check conditions again a week later for safer travel."

---

### ✅ OUTPUT STRUCTURE:

#### 1️⃣ Narrative Itinerary
- Warm intro (destination vibe, weather, cultural highlights).
- Day-by-day breakdown:
  - **Day X: Creative Title**
  - Activities with reasons + emojis
  - **Magic Moment ✨** (special insider tip for that day)
- Mention weather & budget hints naturally.
- Include the **Special Advisory** clearly if conditions are poor.
- End with **"My Secret Tips & Must-Eats"**:
  - 3–5 insider tips
  - 3–5 must-try local dishes or spots
  - **What's On 🎟️:** Briefly list the local events found.
- **What's On 🎟️:** Briefly list the local events found.
- **Packing Checklist 🧳:** 3–5 items to pack based on weather and activities.

---

#### 2️⃣ JSON OUTPUT BLOCKS (MUST BE VALID)

1. **Main Itinerary JSON**
\`\`\`json
[
  { "day": 1, "title": "Day 1: Cultural Gems", "activities": ["Place A", "Place B"] },
  { "day": 2, "title": "Day 2: Beaches & Sunsets", "activities": ["Beach Walk", "Local Café"] }
]
\`\`\`

2. **Extra Info JSON**
\`\`\`json
{
  "tips": ["Carry local currency", "Book attractions early"],
  "mustEats": ["Local dish A", "Street snack B"],
  "highlights": ["Sunset at Beach", "Historic Market"],
  "packingChecklist": ["Comfortable shoes", "Power bank", "Light jacket"]
}
\`\`\`

3. **Summary**
- Short and fun, e.g.:
**Summary:** *"5 dreamy days in Bali with beaches, temples, and sunsets!"*

---

### ✅ Tone & Style:
- Travel-buddy tone: casual, fun, lots of emojis.
- **Order is important**: Narrative → Main JSON → Extra Info JSON → Summary
- Be creative but accurate.
`;


    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiContent = response.data.choices[0].message.content || '';
    logger.info('AI raw output received.');

    // ✅ ENHANCEMENT: Extract all JSON blocks and identify them
    const jsonBlocks = extractJsonBlocks(aiContent);
    const itineraryJson = jsonBlocks.find(block => Array.isArray(block)) || [];
    const extraInfoJson = jsonBlocks.find(block => !Array.isArray(block) && typeof block === 'object') || {};

    const summaryMatch = aiContent.match(/Summary:(.*)/i);
    const summary = summaryMatch ? summaryMatch[1].trim().replace(/"/g, '') : `A trip to ${destinationName}.`;

    const isValid = validateItinerary(itineraryJson);
    if (!isValid) {
      logger.warn('Invalid or empty itinerary JSON from AI. Using fallback.');
    }

    //Populate the result with structured extra info
    const result = {
      itinerary: isValid ? itineraryJson : generateFallbackItinerary(aggregatedData).itinerary,
      formattedText: aiContent || generateFallbackItinerary(aggregatedData).formattedText,
      summary: summary,
      tips: extraInfoJson.tips || [],
      mustEats: extraInfoJson.mustEats || [],
      highlights: extraInfoJson.highlights || [],
      packingChecklist: extraInfoJson.packingChecklist || [],
    };

    if (isValid) {
      await setCache(cacheKey, result, 1800); // Cache for 30 mins
    }

    return result;
  } catch (error) {
    logger.error('AI service failed, using fallback.', { error: error.message });
    return generateFallbackItinerary(aggregatedData);
  }
};

// Add this function to services/aiChatService.js

/**
 * Gets a contextual AI response for a one-on-one AI chat session.
 * @param {string} sessionId - The ID of the chat session.
 * @param {string} userId - The ID of the user sending the message.
 * @param {string} text - The user's message.
 * @returns {Promise<object>} The saved and populated AI message object.
 */
const getAiResponse = async (sessionId, userId, text) => {
    // 1. Fetch recent message history for context
    const history = await Message.find({ chatSession: sessionId }).sort({ createdAt: -1 }).limit(10);
    
    // 2. Call the main AI service to get a casual response
    const aiText = await getCasualResponse(text, history);

    // 3. Save the AI's response to the database
    const aiMessage = new Message({
        chatSession: sessionId,
        sender: null, // Or a dedicated AI user ID
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
  getFilteredResponse
};