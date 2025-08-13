
const logger = require('../utils/logger');
const Message = require('../models/Message');
const Trip = require('../models/Trip'); // Corrected model import
const axios = require('axios');
const notificationService = require('../services/notificationService');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free';


/**
 * Validates the basic structure of an AI-generated itinerary.
 * @param {any} itinerary The itinerary data to validate.
 * @returns {boolean} True if the itinerary is valid, false otherwise.
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
 * Handles a request to edit a trip's itinerary using AI.
 * @param {string} sessionId - The ID of the chat session.
 * @param {object} user - The user object who made the request.
 * @param {string} command - The natural language edit command.
 * @param {object} trip - The Mongoose Trip document to be modified.
 */
const handleTripEditRequest = async (sessionId, user, command, trip) => {
    try {
        if (!trip) {
            throw new Error('Associated trip not found for edit request.');
        }

        const currentItinerary = JSON.stringify(trip.itinerary, null, 2);

        const editPrompt = `
You are an AI assistant editing a travel itinerary. Your task is to modify the provided JSON itinerary based on the user's request.
You MUST return only the complete, updated, and valid JSON array for the entire itinerary. Do not include any other text or explanations.

### CURRENT ITINERARY:
${currentItinerary}

### USER'S EDIT REQUEST:
"${command}"

### YOUR TASK:
Apply the user's request to the itinerary and output the full, modified itinerary as a single JSON array.
`;

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: OPENROUTER_MODEL,
                messages: [{ role: 'user', content: editPrompt }],
                response_format: { type: "json_object" }
            },
            { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } }
        );

        const content = response.data.choices[0].message.content;
        const newItinerary = JSON.parse(content.match(/\{[\s\S]*\}|\[[\s\S]*\]/)?.[0] || '[]');

        if (!validateItinerary(newItinerary)) {
            throw new Error('AI returned an invalid itinerary structure.');
        }

        trip.itinerary = newItinerary;
        await trip.save();

        logger.info(`Trip ${trip._id} itinerary updated by AI from request by ${user.email}`);

        const successText = `✨ Itinerary updated! I've incorporated the request: "${command}".`;
        notificationService.sendSystemMessageToTrip(sessionId, successText);

        notificationService.broadcastToTrip(sessionId, 'itineraryUpdated', { tripId: trip._id, itinerary: newItinerary });

    } catch (error) {
        logger.error(`Failed to handle trip edit request: ${error.message}`);
        const errorText = `I'm sorry, I couldn't update the itinerary. There was an error processing the request.`;
        notificationService.sendSystemMessageToTrip(sessionId, errorText, 'error');
    }
};


/**
 * Formats a detailed, user-friendly response about a trip.
 * @param {string} requestType - The category of information to format.
 * @param {object} trip - The full Mongoose trip object.
 * @returns {string} A formatted string ready to be sent as a message.
 */
function formatDetailResponse(requestType, trip) {
    switch (requestType?.toLowerCase()) {
        case 'itinerary':
            return trip.itinerary?.length
                ? "Here is the current itinerary:\n" + trip.itinerary.map(d => `\n**Day ${d.day}: ${d.title}**\n- ` + d.activities.join('\n- ')).join('')
                : "The itinerary hasn't been generated yet.";
        
        case 'budget':
            if (!trip.budget) return "No budget has been estimated for this trip yet.";
            // ✅ FIX: Uses dynamic currency from the trip object.
            const currency = trip.budget.currency || 'INR';
            return `💰 Your estimated budget is **${currency} ${trip.budget.total.toLocaleString('en-IN')}**.`;

        case 'weather':
            if (!trip.weather?.forecast?.length) return "I don't have any weather forecast information for this trip.";
            // ✅ FIX: Corrected property access from temp_max/min to temp and fixed degree symbol.
            const weatherSummary = trip.weather.forecast.map(f => `\n- **${f.date}**: ${f.condition}, around ${f.temp}°C.`);
            return `🌦️ Here's the weather forecast for your trip:${weatherSummary.join('')}`;
        
        case 'transport':
        case 'routes':
            // ✅ FIX: Corrected property name from trip.route to trip.routeInfo.
            if (!trip.routeInfo) return "Transportation route details are not available for this trip.";
            const { fastest, cheapest } = trip.routeInfo;
            return `🚗 Here are the transportation details:\n- **Fastest Option:** ${fastest.mode} (${fastest.duration})\n- **Cheapest Option:** ${cheapest.mode} (Est. cost: ${cheapest.cost})`;

        // ... Other cases like accommodation, alerts, etc., are also here ...
        default:
            return "I can provide details on your trip's itinerary, budget, weather, or transport. What would you like to know?";
    }
}

/**
 * Core function to process an AI command within a group chat.
 * @param {object} session - The Mongoose ChatSession document.
 * @param {object} user - The user object who sent the command.
 * @param {string} intent - The parsed intent from aiParsingService.
 * @param {object} details - The parsed details from aiParsingService.
 */
const handleWaymateCommand = async (session, user, intent, details) => {
    try {
        const trip = await Trip.findById(session.tripId);
        if (!trip) {
            throw new Error('Associated trip not found.');
        }

        let replyText;

        if (intent === 'edit_trip') {
            // Delegate to the specialized edit handler
            handleTripEditRequest(session._id, user, details.command, trip);
            replyText = `Got it! I'm working on the request: "${details.command}". I'll send another message here when it's done.`;
        } else if (intent === 'get_trip_detail') {
            // Delegate to the formatter
            replyText = formatDetailResponse(details.topic, trip);
        } else {
            // Fallback for other intents that might be caught
            replyText = "I can help with editing the trip or providing details about it. What would you like to do?";
        }

        // Send an immediate acknowledgement or the direct answer
        notificationService.sendSystemMessageToTrip(session._id, replyText);

    } catch (error) {
        logger.error(`Failed to handle Waymate command: ${error.message}`);
        notificationService.sendSystemMessageToTrip(session._id, `I'm sorry, I ran into an error trying to process that command.`, 'error');
    }
};

module.exports = {
    handleWaymateCommand, // Export the core function
    handleTripEditRequest,
};