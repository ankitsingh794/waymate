/**
 * @fileoverview A dedicated service for handling small, specific AI parsing tasks
 * needed for conversational flows, like intent detection and entity extraction.
 */

const axios = require('axios');
const logger = require('../utils/logger');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PARSING_MODEL = process.env.PARSING_MODEL || 'mistralai/mistral-7b-instruct:free';

/**
 * ENHANCED: Detects the user's primary intent and extracts a comprehensive set of entities
 * from their message in a single pass.
 * @param {string} userMessage The initial message from the user.
 * @returns {object} An object containing the detected 'intent' and any extracted 'details'.
 */
async function detectIntentAndExtractEntity(userMessage) {
  const prompt = `
    You are an expert travel assistant AI that extracts structured data from a user's request.
    Your task is to analyze the user's message, identify their intent, and extract all relevant details into a single, minified JSON object.

    ### Intents & Entities

    1.  **create_trip**: The user wants to plan a new trip. Extract any of the following entities you can find:
        - **destination** (string): The primary location of the trip.
        - **dates** (object): Should contain "startDate" and "endDate" in YYYY-MM-DD format. Infer dates from phrases like "next weekend" or "the first week of August".
        - **interests** (array of strings): Keywords related to activities like "beaches", "food", "history", "adventure".
        - **budget** (string): One of ["budget", "standard", "luxury"].

    2.  **get_trip_detail**: User wants info on an existing trip.
    3.  **edit_trip**: User wants to modify a trip.
    4.  **casual_chat**: A general conversation or greeting.

    ---
    ### Important Instructions
    - **Current Date for Reference:** ${new Date().toISOString()}
    - If the user provides a duration (e.g., "for a week") but no start date, leave the dates object empty.
    - If a user mentions "next weekend", assume it's the upcoming Friday to Sunday.
    - Always respond with only the minified JSON object and nothing else.

    ---
    ### Examples
    1. "Plan a budget trip to Goa next weekend, I like beaches" -> {"intent":"create_trip","details":{"destination":"Goa","dates":{"startDate":"2025-07-25","endDate":"2025-07-27"},"budget":"budget","interests":["beaches"]}}
    2. "I want to go to Rishikesh" -> {"intent":"create_trip","details":{"destination":"Rishikesh"}}
    3. "hello there" -> {"intent":"casual_chat","details":{}}

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
    // Fail safely to casual chat
    return { intent: 'casual_chat', details: { message: userMessage } };
  }
}

// extractEntityForSlot remains the same as it's used for specific follow-up questions.
async function extractEntityForSlot(userMessage, slotDefinition) {
    // ... (This function's existing code does not need to change)
}


module.exports = {
  detectIntentAndExtractEntity,
  extractEntityForSlot
};