

const axios = require('axios');
const logger = require('../utils/logger');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PARSING_MODEL = process.env.PARSING_MODEL || 'mistralai/mistral-7b-instruct:free';

async function detectIntentAndExtractEntity(userMessage) {
  const prompt = `
    You are an expert travel assistant AI that functions as an intelligent router. Your primary function is to analyze the user's message, classify it into ONE of the defined intents, and extract all available entities into a single, minified JSON object. Your output must ONLY be this JSON object.

    ### Intents & Entities
    1.  **create_trip**: The user wants to plan a new multi-day trip.
        - Entities: "destination", "dates", "interests", "budget", "travelers".
    2.  **suggest_destination**: The user is asking for ideas or doesn't know where to go.
        - Entities: "interests", "budget", "duration".
    3.  **casual_chat**: A general conversation or a query you cannot otherwise classify.

    ---
    ### 🧠 Core Logic & Rules (Follow these strictly)
    - **CRITICAL RULE: Do NOT infer, invent, or hallucinate any details** that are not explicitly provided in the user's message. If a detail (like dates, budget, interests) is missing, OMIT it entirely from the JSON output.
    - **Current Date for Reference:** ${new Date().toISOString()}
    - **Suggestion vs. Creation:** If the user asks "where should I go," the intent is \`suggest_destination\`. If they provide a destination, the intent is \`create_trip\`.
    - **Incomplete Information:** If a user says "plan a trip" but gives no destination, the intent is \`create_trip\`, and the "details" object will be empty.
    - **Output:** Respond ONLY with the minified JSON object. No explanations.

    ---
    ### 📚 Examples
    1.  **User:** "Plan a budget trip to Goa next weekend for 2 people. We like beaches."
        **AI:** \`{"intent":"create_trip","details":{"destination":"Goa","dates":{"startDate":"2025-08-01","endDate":"2025-08-03"},"budget":"budget","travelers":2,"interests":["beaches"]}}\`
    2.  **User:** "Plan a trip to Shimla"
        **AI:** \`{"intent":"create_trip","details":{"destination":"Shimla"}}\`
    3.  **User:** "plan a trip"
        **AI:** \`{"intent":"create_trip","details":{}}\`

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
        timeout: 5000
      }
    );
    let aiResponseText = response.data.choices[0].message.content;
    let jsonString = null;

    const match = aiResponseText.match(/\{[\s\S]*\}/);

    if (match && match[0]) {
      // If a JSON-like structure is found, extract it.
      jsonString = match[0];
    } else {
      // If no JSON object is found, the response is invalid.
      logger.error('AI intent detection failed: No JSON object found in the AI response.', {
        query: userMessage,
        aiResponse: aiResponseText // Log the bad response for debugging
      });
      return { intent: 'casual_chat', details: {} };
    }

    // Attempt to parse the extracted string.
    const result = JSON.parse(jsonString);

    logger.info(`Intent detected: ${result.intent}`, { details: result.details });
    return result;

  } catch (error) {
    // This will catch final parsing errors or network issues.
    logger.error('AI intent detection failed:', { errorMessage: error.message, query: userMessage });
    return { intent: 'casual_chat', details: {} };
  }
};
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

  const { type, options } = slotDefinition.validation;
  let prompt;

  switch (type) {
    case 'date_range':
      prompt = `
        You are a date extraction expert. The user's message is: "${userMessage}".
        Your reference date is: "${new Date().toISOString()}".
        You MUST return a JSON object with exactly two keys: "startDate" and "endDate" in "YYYY-MM-DD" format.
        For example, for "next weekend", you would return {"startDate": "2025-08-01", "endDate": "2025-08-03"}.
        For "August 10th", assume it's a single-day trip and return {"startDate": "2025-08-10", "endDate": "2025-08-10"}.
        JSON Output:`;
      break;

    case 'choice':
      prompt = `
        You are a classification expert. The user's response is: "${userMessage}".
        The valid options are: ${options.join(', ')}.
        Your task is to respond with ONLY the single best-matching option from the list.
        For example, if the user says "I want to save money", and the options are "budget", "standard", "luxury", you must respond with "budget".
        Do not add any other text.
        Matching Option:`;
      break;

    case 'list': // Primarily for interests
      prompt = `
        You are an activity extraction expert. The user's stated interest is: "${userMessage}".
        Extract the core activity or theme.
        CRITICAL: If the user's message is a day of the week (like Sunday, Monday, etc.), you MUST respond with the word "invalid".
        Otherwise, respond with the extracted interest.
        Extracted Interest:`;
      break;

    default:
      return userMessage; // Fallback for unknown types
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: PARSING_MODEL,
        messages: [{ role: 'user', content: prompt }],
        // Use JSON format only for the date_range, as others are simple strings
        ...(type === 'date_range' && { response_format: { type: "json_object" } })
      },
      { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } }
    );

    let content = response.data.choices[0].message.content.trim();

    // Post-processing and validation
    if (type === 'list' && (content.toLowerCase() === 'invalid' || /sunday|monday|tuesday|wednesday|thursday|friday|saturday/i.test(content))) {
      logger.warn(`AI parsing rejected invalid interest: "${content}"`);
      return null; // Reject the invalid interest
    }
    
    if (type === 'date_range') {
        // Ensure the JSON response is clean before parsing
        const match = content.match(/\{[\s\S]*\}/);
        if (match) content = match[0];
        const parsedDate = JSON.parse(content);
        // Final validation for the date object structure
        if (parsedDate.startDate && parsedDate.endDate) {
            return parsedDate;
        }
        // Handle single date response by making it a one-day trip
        if (parsedDate.date) {
            return { startDate: parsedDate.date, endDate: parsedDate.date };
        }
        throw new Error('Invalid date structure returned by AI');
    }

    return content; // For 'choice' and 'list' types
    
  } catch (error) {
    logger.error(`AI slot extraction failed for slot type ${type}:`, error.message);
    return null;
  }
}

module.exports = {
  detectIntentAndExtractEntity,
  extractEntityForSlot
};