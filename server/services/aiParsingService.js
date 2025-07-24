const axios = require('axios');
const logger = require('../utils/logger');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PARSING_MODEL = process.env.PARSING_MODEL || 'mistralai/mistral-7b-instruct:free';

/**
 * Detects the user's primary intent and extracts all relevant details in a single pass.
 * This is the first point of AI contact in a conversation.
 * @param {string} userMessage The initial message from the user.
 * @returns {object} An object containing the detected 'intent' and any extracted 'details'.
 */
async function detectIntentAndExtractEntity(userMessage) {
  const prompt = `
    You are an expert travel assistant AI that functions as an intelligent router. Your primary function is to analyze the user's message, classify it into ONE of the defined intents, and extract all available entities into a single, minified JSON object. Your output must ONLY be this JSON object.

    ### Intents & Entities

    1.  **create_trip**: The user wants to plan a new multi-day trip to a KNOWN destination.
        - Entities: "destination" (string), "dates" (object with startDate, endDate), "interests" (array), "budget" (string: "budget", "standard", or "luxury"), "travelers" (number).

    2.  **find_place**: The user wants to find a specific type of local spot for a short-term activity.
        - Entities: "query" (string), "location" (string), "date_context" (string, e.g., "next wednesday", "tonight").

    3.  **get_trip_detail**: The user wants specific information about an EXISTING trip.
        - Entities: "trip_identifier" (string, e.g., "my trip to Goa"), "request" (string, e.g., "budget", "itinerary").

    4.  **edit_trip**: The user wants to modify an EXISTING trip.
        - Entities: "trip_identifier" (string), "command" (string: the specific edit instruction).
    
    5.  **convert_budget**: The user wants to convert the budget of an EXISTING trip to another currency.
        - Entities: "trip_identifier" (string), "currency" (string: e.g., "USD", "Euros").

    6.  **casual_chat**: A general conversation, greeting, or a query you cannot otherwise classify. No entities needed.

    ---
    ### 🧠 Core Logic & Rules (Follow these strictly)

    - **Current Date for Reference:** ${new Date().toISOString()}
    - **Suggestion vs. Creation:** If the user asks "where should I go" or for ideas, the intent is ALWAYS \`suggest_destination\`. If they provide a destination, the intent is \`create_trip\`.
    - **Day Trip vs. Multi-Day Trip**: If a request is for a single local spot (cafe, park), it is 'find_place'. Extract any time information like "tonight" or "next weekend" as 'date_context'.
    - **Context is Key:** For \`get_trip_detail\`, \`edit_trip\`, and \`convert_budget\`, the user MUST provide a way to identify the trip (e.g., "my trip to Goa," "the Delhi plan"). If no trip identifier is present, the intent is \`casual_chat\`.
    - **Entity Inference:**
        - Infer dates from relative terms ("next weekend", "in two weeks", "around Christmas").
        - Infer travelers from phrases ("for me and my family" -> 4, "a couple's trip" -> 2).
    - **Output:** Respond ONLY with the minified JSON object. No explanations.

    ---
    ### 📚 Examples

    1.  **User:** "Plan a budget trip to Goa next weekend for 2 people. We like beaches."
        **AI:** \`{"intent":"create_trip","details":{"destination":"Goa","dates":{"startDate":"2025-08-01","endDate":"2025-08-03"},"budget":"budget","travelers":2,"interests":["beaches"]}}\`
    
    2.  **User:** "Find me a quiet romantic restaurant in Jamshedpur"
        **AI:** \`{"intent":"find_place","details":{"query":"a quiet romantic restaurant","location":"Jamshedpur"}}\`

    3.  **User:** "What's the weather forecast for my trip to Delhi?"
        **AI:** \`{"intent":"get_trip_detail","details":{"trip_identifier":"trip to Delhi","request":"weather"}}\`
    
    4.  **User:** "Add a visit to the Louvre to my Paris plan."
        **AI:** \`{"intent":"edit_trip","details":{"trip_identifier":"Paris plan","command":"add a visit to the Louvre"}}\`
    
    5.  **User:** "What's the budget for that trip in dollars?"
        **AI:** \`{"intent":"convert_budget","details":{"trip_identifier":"that trip","currency":"dollars"}}\`
    
    6.  **User:** "What's the budget?" (No trip mentioned)
        **AI:** \`{"intent":"casual_chat","details":{}}\`
    
    7.  **User:** "Hi how are you"
        **AI:** \`{"intent":"casual_chat","details":{}}\`

    ---
    ### User Message
    "${userMessage}"

    ---
    ### JSON Output
    `;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: PARSING_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" }
      },
      {
        headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` },
        timeout: 5000 // Add a timeout for reliability
      }
    );
    const aiResponseText = response.data.choices[0].message.content;

    // Use a regular expression to find the first valid JSON object in the response text.
    const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No valid JSON object found in AI response.');
    }

    const result = JSON.parse(jsonMatch[0]);

    logger.info(`Intent detected: ${result.intent}`, { details: result.details });
    return result;
  } catch (error) {
    logger.error('AI intent detection failed:', { errorMessage: error.message, query: userMessage });
    return { intent: 'casual_chat', details: { message: userMessage } };
  }
}

/**
 * Extracts a specific piece of information from a user's message when the bot is in a
 * slot-filling conversation (i.e., after asking a direct question).
 * @param {string} userMessage The user's answer to a specific question.
 * @param {object} slotDefinition The definition of the slot we are trying to fill.
 * @returns {any} The extracted data in the format defined by the slot.
 */
async function extractEntityForSlot(userMessage, slotDefinition) {
  if (!slotDefinition.validation) {
    return userMessage;
  }

  const schemas = {
    date_range: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date', description: 'The start date in YYYY-MM-DD format.' },
        endDate: { type: 'string', format: 'date', description: 'The end date in YYYY-MM-DD format.' }
      },
      required: ['startDate', 'endDate']
    },
    list: {
      type: 'array',
      items: { type: 'string', description: 'A user interest or preference.' }
    },
    choice: {
      type: 'string',
      enum: slotDefinition.validation.options
    }
  };

  const schema = schemas[slotDefinition.validation.type];
  if (!schema) {
    return userMessage;
  }
  const prompt = `
    You are a data extraction expert. Analyze the user's message to extract the requested information based on the provided JSON schema.
    Respond with a single, minified JSON object containing the extracted data. Do not include any other text.
    Cases can be overview, itinerary,budget,

    ---
    ### Context
    // ✅ MODIFIED: Added the day of the week for better relative date understanding.
    - Current Date: "${new Date().toISOString().split('T')[0]} (Today is a ${new Date().toLocaleString('en-US', { weekday: 'long' })})"
    - User's Message: "${userMessage}"
    ---
    ### Extraction Schema
    ${JSON.stringify(schema)}
    ---

    JSON Output:`;
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: PARSING_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" }
      },
      { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } }
    );
    const result = JSON.parse(response.data.choices[0].message.content);
    if (slotDefinition.validation.type === 'date_range') {
      return result;
    }
    const key = Object.keys(result)[0];
    return result[key] || result;
  } catch (error) {
    logger.error(`AI slot extraction failed for slot type ${slotDefinition.validation.type}:`, error.message);
    return null;
  }
}


module.exports = {
  detectIntentAndExtractEntity,
  extractEntityForSlot
};