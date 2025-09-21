// Simple test for the transportation filter function
require('dotenv').config();
const axios = require('axios');

// Mock the logger to avoid dependency issues
const mockLogger = {
  info: console.log,
  error: console.error
};

// Copy the checkIfTransportationRelated function for testing
async function checkIfTransportationRelated(userMessage) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const PARSING_MODEL = 'mistralai/mistral-small-3.2-24b-instruct:free';
  
  const filterPrompt = `
You are a transportation and travel topic classifier. Your job is to determine if a user's query is related to transportation, travel, or trip planning.

TRANSPORTATION/TRAVEL TOPICS INCLUDE:
- Trip planning, itineraries, destinations
- Transportation (flights, trains, buses, cars, boats, etc.)
- Hotels, accommodations, lodging
- Tourist attractions, activities, restaurants while traveling
- Travel advice, visa requirements, weather for travel
- Local places, "near me" searches when traveling
- Budget planning for trips
- Travel safety, packing advice
- Cultural tips for destinations

NON-TRANSPORTATION TOPICS INCLUDE:
- Cooking recipes, food preparation at home
- Technology support, programming help
- General health advice (not travel-related)
- Personal relationships, dating advice
- Home improvement, gardening
- Academic subjects (math, science, etc.)
- Entertainment recommendations (unless travel-related)
- Shopping for non-travel items
- Work/career advice (unless travel-related)

Respond with ONLY "YES" if the query is transportation/travel-related, or "NO" if it's not.

User Query: "${userMessage}"

Response:`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      { 
        model: PARSING_MODEL, 
        messages: [{ role: 'user', content: filterPrompt }],
        max_tokens: 10
      },
      { 
        headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` }, 
        timeout: 15000 
      }
    );
    
    const aiResponse = response.data.choices[0].message.content.trim().toUpperCase();
    const isTransportationRelated = aiResponse === 'YES';
    
    mockLogger.info(`Transportation filter check for "${userMessage}": ${aiResponse} (${isTransportationRelated})`);
    return isTransportationRelated;
    
  } catch (error) {
    mockLogger.error('Transportation filter check failed:', { errorMessage: error.message, query: userMessage });
    // If filter fails, default to allowing the query to be safe
    return true;
  }
}

async function testTransportationFilter() {
  console.log('🔍 Testing Transportation Filter Function\n');
  
  const testQueries = [
    "help me make a cookie in Japanese",
    "plan a trip to Tokyo", 
    "how do I fix my computer",
    "find good restaurants near me",
    "solve this math equation",
    "what's the best time to visit Thailand",
    "I'm planning a budget-friendly, adventurous, and scenic leisure trip by train to Vizag for three friends from November 10th to November 20th"
  ];
  
  for (const query of testQueries) {
    console.log(`Testing: "${query}"`);
    try {
      const result = await checkIfTransportationRelated(query);
      console.log(`Result: ${result ? 'TRANSPORTATION ✅' : 'NON-TRANSPORTATION ❌'}\n`);
    } catch (error) {
      console.log(`Error: ${error.message}\n`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testTransportationFilter().catch(console.error);