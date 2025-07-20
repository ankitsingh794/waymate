/**
 * @fileoverview A dedicated service for handling small, specific AI parsing tasks
 * needed for conversational flows, like intent detection and entity extraction.
 */

const axios = require('axios');
const logger = require('../utils/logger');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PARSING_MODEL = process.env.PARSING_MODEL || 'mistralai/mistral-7b-instruct:free';

/**
 * Detects the user's primary intent and extracts key entities from their message.
 * This is the first point of AI contact in a conversation.
 * @param {string} userMessage The initial message from the user.
 * @returns {object} An object containing the detected 'intent' and any extracted 'details'.
 */
async function detectIntentAndExtractEntity(userMessage) {
  const prompt = `
    You are an expert at understanding user requests in a travel planning chat.
    Your task is to analyze the user's message and classify their intent.
    You must respond with a single, minified JSON object and nothing else.

    ### Intents & Entities

    1.  **create_trip**: The user wants to start planning a new trip.
        - **Entity**: "destination" (string). The primary location.
        - *Example*: "plan a trip to Paris" -> {"intent": "create_trip", "details": {"destination": "Paris"}}

    2.  **get_trip_detail**: The user is asking for specific information about a trip that has already been planned.
        - **Entity**: "request" (string). Can be one of ["itinerary", "budget", "weather", "packing_list", "food", "tips", "all_details"].
        - **Options**: "day" (number, if mentioned).
        - *Example*: "what's the plan for day 2?" -> {"intent": "get_trip_detail", "details": {"request": "itinerary", "options": {"day": 2}}}
        - *Example*: "what should I eat there" -> {"intent": "get_trip_detail", "details": {"request": "food"}}
        - *Example*: "show me everything" -> {"intent": "get_trip_detail", "details": {"request": "all_details"}}

    3.  **edit_trip**: The user wants to modify an existing trip plan.
        - **Entity**: "command" (string). The user's full instruction.
        - *Example*: "add the louvre to day 3" -> {"intent": "edit_trip", "details": {"command": "add the louvre to day 3"}}

    4.  **casual_chat**: The user is making small talk or asking a question not related to the above.
        - **Entity**: "message" (string). The user's original message.
        - *Example*: "hello there" -> {"intent": "casual_chat", "details": {"message": "hello there"}}

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
      { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } }
    );
    const result = JSON.parse(response.data.choices[0].message.content);
    logger.info(`Intent detected: ${result.intent}`, { details: result.details });
    return result;
  } catch (error) {
    logger.error('AI intent detection failed:', error.message);
    return { intent: 'casual_chat', details: { message: userMessage } };
  }
}

/**
 * Extracts structured data from a user's message based on a specific slot's requirements.
 * @param {string} userMessage The user's reply.
 * @param {object} slotDefinition The definition of the slot we are trying to fill from the conversation flow config.
 * @returns {object} The structured data extracted from the message.
 */
async function extractEntityForSlot(userMessage, slotDefinition) {
  const schemas = {
    date_range: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'The start date in YYYY-MM-DD format.' },
        endDate: { type: 'string', description: 'The end date in YYYY-MM-DD format.' }
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

    ---
    ### Context
    - Current Date: "${new Date().toISOString().split('T')[0]}"
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
    const key = Object.keys(result)[0];
    return result[key] || result;

  } catch (error) {
    logger.error('AI entity extraction failed:', error.message);
    return userMessage;
  }
}

module.exports = {
  detectIntentAndExtractEntity,
  extractEntityForSlot
};
