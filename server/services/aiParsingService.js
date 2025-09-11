const axios = require('axios');
const logger = require('../utils/logger');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PARSING_MODEL = process.env.PARSING_MODEL || 'mistralai/mistral-small-3.2-24b-instruct:free';

async function detectIntentAndExtractEntity(userMessage) {
  const prompt = `
You are an expert travel assistant AI that functions as an intelligent router. Your primary function is to analyze the user's message, classify it into ONE of the defined intents, and extract all available entities into a single, minified JSON object. Your output must ONLY be this JSON object.

### Intents & Entities
1.  **create_trip**: User wants to plan a new multi-day trip to a specific destination.
     - Entities: "destination", "vibe", "dates" (object with "startDate", "endDate"), "interests", "budget", "travelers", "transportMode", "purpose", "creatorAgeGroup", "creatorGender".
2.   **find_place**: User is looking for a local spot, activity, or a specific type of place (e.g., restaurant, romantic spot, adventure park), often with a sense of immediacy ("near me", "tomorrow").
    - Entities: "query" (the description of the place), "location".
3.  **edit_trip**: User wants to modify an existing trip (only in a group chat).
    - Entities: "command".
4.  **get_trip_detail**: User is asking about an existing trip (only in a group chat).
    - Entities: "topic" (e.g., 'weather', 'budget', 'itinerary').
5.  **casual_chat**: A general conversation or a query you cannot otherwise classify.
6.  **suggest_destination**: User wants ideas or recommendations for a trip but hasn't picked a place.
    - Entities: "vibe", "interests", "travelers".
7.  **find_transport**: User wants to find transport (flights, trains, etc.) between two points.
    - Entities: "origin", "destination", "transportMode", "travelDate".
8.  **plan_day_trip**: User wants to plan a single-day excursion.
    - Entities: "destination", "origin" (optional base city), "dayTripDate", "interests".
9.  **get_travel_advice**: User is asking a general, factual question about a destination or travel topic.
    - Entities: "topic" (e.g., "best time to visit", "safety", "visa requirements"), "destination".
10. **estimate_budget**: User wants a cost estimate for a trip without a full itinerary.
    - Entities: "destination", "duration" (e.g., "5 days"), "travelers", "budget" (e.g., 'luxury').

---
### 🧠 Core Logic & Rules
- **CRITICAL RULE:** Do NOT infer details. If a detail is missing, OMIT it from the JSON.
- **Current Date:** ${new Date().toISOString()}
- **Output:** Respond ONLY with the minified JSON object.
- **Prioritization:** If a user asks for a cost estimate for a specific duration, prefer 'estimate_budget'. If they ask to plan a trip for a specific duration, prefer 'create_trip'.
- **Analysis Steps:** First, identify all key pieces of information in the user's message (what, where, when, who, why, how). Second, map this information to the available entities. Finally, construct the single JSON output.

---
### 📚 Examples
1.  **User:** "Plan a budget trip to Goa next weekend for 2 people."
    **AI:** \`{"intent":"create_trip","details":{"destination":"Goa","budget":"budget","dates":{"startDate":"2025-08-15","endDate":"2025-08-17"},"travelers":2}}\`
2.  **User:** "Find good cafes near me"
    **AI:** \`{"intent":"find_place","details":{"query":"good cafes","location":"current"}}\`
3. **User:** "show me some adventurous spots nearby for tomorrow"
    **AI:** \`{"intent":"find_place","details":{"query":"adventurous spots for tomorrow","location":"current"}}\`
4.  **User:** "find a romantic place for a date tonight"
    **AI:** \`{"intent":"find_place","details":{"query":"romantic date spot","location":"current"}}\`
5.  **User:** "add a visit to the museum on day 2"
    **AI:** \`{"intent":"edit_trip","details":{"command":"add a visit to the museum on day 2"}}\`
6.  **User:** "what's the weather like?"
    **AI:** \`{"intent":"get_trip_detail","details":{"topic":"weather"}}\`
7.  **User:** "hi how are you"
    **AI:** \`{"intent":"casual_chat","details":{}}\`
8.  **User:** "where should I go for an adventure trip?"
    **AI:** \`{"intent":"suggest_destination","details":{"interests":["adventure"]}}\`
9.  **User:** "Find me a flight from Mumbai to Delhi tomorrow"
    **AI:** \`{"intent":"find_transport","details":{"origin":"Mumbai","destination":"Delhi","transportMode":"flight","travelDate":"2025-08-15"}}\`
10.  **User:** "Plan a day trip to the Taj Mahal from Delhi"
    **AI:** \`{"intent":"plan_day_trip","details":{"destination":"Taj Mahal","origin":"Delhi"}}\`
11.  **User:** "What's the best time to visit Shimla?"
    **AI:** \`{"intent":"get_travel_advice","details":{"topic":"best time to visit","destination":"Shimla"}}\`
12. **User:** "How much would a 3-day luxury trip to Udaipur cost for 2?"
    **AI:** \`{"intent":"estimate_budget","details":{"destination":"Udaipur","duration":"3 days","travelers":2,"budget":"luxury"}}\`
13. **User:** "I need to go to Mumbai for a business conference next week."
    **AI:** \`{"intent":"create_trip","details":{"destination":"Mumbai","purpose":"work","dates":{...}}\`
14. **User:** "Plan a relaxing and adventurous leisure trip to Manali from October 5th to October 10th for 2 people with a standard budget, traveling by car, with interests in hiking and local food."
    **AI:** \`{"intent":"create_trip","details":{"destination":"Manali","vibe":"relaxing and adventurous","purpose":"leisure","dates":{"startDate":"2025-10-05","endDate":"2025-10-10"},"travelers":2,"budget":"standard","transportMode":"car","interests":["hiking","local food"]}}\`


---
### User Message
"${userMessage}"
---
### JSON Output
`;
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      { model: PARSING_MODEL, messages: [{ role: 'user', content: prompt }] },
      { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` }, timeout: 20000 }
    );
    let aiResponseText = response.data.choices[0].message.content;
    const match = aiResponseText.match(/\{[\s\S]*\}/);
    if (!match || !match[0]) {
      throw new Error('No JSON object found in the AI response.');
    }
    const result = JSON.parse(match[0]);
    logger.info(`Intent detected: ${result.intent}`, { details: result.details });
    return result;
  } catch (error) {
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
  console.log('\n--- [DEBUG] AI Slot Extraction Initiated ---');
  console.log(`[DEBUG Step 1/5] User message: "${userMessage}", Slot Type: "${slotDefinition.validation?.type}"`);

  if (!slotDefinition.validation) {
    console.log('[DEBUG SUCCESS] No validation needed. Returning raw user message.');
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

    case 'list':
      prompt = `
You are an expert at parsing user interests for travel planning. Your task is to extract up to 3 core activities or themes from the user's message.

### USER MESSAGE:
"${userMessage}"

### TASK:
Analyze the user's message and identify the main travel interests. You MUST return a single, valid JSON object with one key: "interests", which should be an array of strings.

### 📚 EXAMPLES:
- User: "I love visiting historical sites and trying new food." -> AI: \`{"interests":["history","food"]}\`
- User: "adventure and relaxing" -> AI: \`{"interests":["adventure","relaxing"]}\`
- User: "I'm not sure, maybe something outdoorsy." -> AI: \`{"interests":["outdoors"]}\`

### JSON OUTPUT:
`;
      break;
    case 'number':
      prompt = `
You are an expert at extracting numerical data. Your task is to find the single number in the user's message.

### USER MESSAGE:
"${userMessage}"

### TASK:
Respond with ONLY the numerical value. If there are no numbers, respond with "1".

### 📚 EXAMPLES:
- User: "5 people" -> AI: \`5\`
- User: "just me" -> AI: \`1\`
- User: "a couple" -> AI: \`2\`

### YOUR RESPONSE (number only):
`;
      break;

    default:
      console.log(`[DEBUG SUCCESS] Unknown validation type. Returning raw user message.`);
      return userMessage;
  }

  console.log('[DEBUG Step 2/5] Generated prompt for AI.');

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: PARSING_MODEL,
        messages: [{ role: 'user', content: prompt }],
        ...((type === 'date_range' || type === 'list') && { response_format: { type: "json_object" } })
      },
      { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } }
    );

    let content = response.data.choices[0].message.content.trim();
    console.log(`[DEBUG Step 3/5] Received RAW response from AI:`, content);

    if (type === 'date_range' || type === 'list') {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match || !match[0]) {
        console.error('[DEBUG FAILURE] AI response did not contain a valid JSON object.');
        throw new Error('No valid JSON object found in AI response.');
      }

      const jsonString = match[0];
      console.log(`[DEBUG Step 4/5] Extracted JSON string: ${jsonString}`);
      const parsedJson = JSON.parse(jsonString);
      console.log(`[DEBUG Step 5/5] Successfully parsed JSON.`);

      if (type === 'list') {
        console.log(`[DEBUG SUCCESS] Returning interests:`, parsedJson.interests);
        return parsedJson.interests || [];
      }
      if (type === 'number') {
        const number = parseInt(content, 10);
        return isNaN(number) ? 1 : number;
      }
      if (type === 'date_range') {
        if (parsedJson.startDate && parsedJson.endDate) {
          console.log(`[DEBUG SUCCESS] Returning dates:`, parsedJson);
          return parsedJson;
        }
        throw new Error('Invalid date structure returned by AI');
      }
    }

    console.log(`[DEBUG SUCCESS] Returning content for choice: "${content}"`);
    return content;

  } catch (error) {
    console.error(`[DEBUG CRITICAL FAILURE] The process failed at or after Step 3.`);
    logger.error(`AI slot extraction failed for slot type ${type}:`, { errorMessage: error.message });
    return null;
  }
}


module.exports = {
  detectIntentAndExtractEntity,
  extractEntityForSlot
};