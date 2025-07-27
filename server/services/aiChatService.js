const logger = require('../utils/logger');
const Message = require('../models/Message');
const ChatSession = require('../models/ChatSession');
const Trip = require('../models/Trip');
const axios = require('axios');
const notificationService = require('../services/notificationService');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3-70b-instruct';

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
 * Handles a request from a group chat to edit the shared trip plan.
 * @param {string} sessionId - The ID of the chat session.
 * @param {object} user - The user object who made the request.
 * @param {string} command - The edit command (e.g., "add a visit to the Eiffel Tower on day 2").
 */
const handleTripEditRequest = async (sessionId, user, command) => {
    const { getSocketIO } = require('../utils/socket');
    const io = getSocketIO();
    try {
        // 1. Find the associated trip
        const session = await ChatSession.findById(sessionId);
        if (!session || !session.tripId) {
            throw new Error('This chat session is not linked to a trip.');
        }
        const trip = await Trip.findById(session.tripId);
        if (!trip) {
            throw new Error('Associated trip not found.');
        }

        const currentItinerary = JSON.stringify(trip.itinerary, null, 2);

        // 2. Create a specialized prompt for the AI
        const editPrompt = `
You are an AI assistant editing a travel itinerary for a group.
Your task is to modify the provided JSON itinerary based on the user's request.
You MUST return only the complete, updated, and valid JSON array for the entire itinerary. Do not include any other text, greetings, or explanations.

### CURRENT ITINERARY:
${currentItinerary}

### USER'S EDIT REQUEST:
"${command}"

### YOUR TASK:
Apply the user's request to the itinerary and output the full, modified itinerary as a single JSON array.
`;

        // 3. Call the AI model
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: OPENROUTER_MODEL,
                messages: [{ role: 'user', content: editPrompt }],
                response_format: { type: "json_object" } // Enforce JSON output for reliability
            },
            { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } }
        );

        const newItinerary = JSON.parse(response.data.choices[0].message.content);

        // 4. Validate the new itinerary structure
        if (!validateItinerary(newItinerary)) {
            throw new Error('AI returned an invalid itinerary structure.');
        }

        // 5. Update the trip in the database
        trip.itinerary = newItinerary;
        // Also update the formatted plan to reflect the change, or clear it to be regenerated
        trip.formattedPlan = "The itinerary has been updated. A new detailed plan can be generated if needed.";
        await trip.save();

        logger.info(`Trip ${trip._id} itinerary updated by AI based on request from ${user.email}`);

        // 6. Send a success confirmation message to the group chat
        const successMessage = await Message.create({
            chatSession: sessionId,
            type: 'system',
            text: `✨ Itinerary updated by WayMate! I've incorporated the request: "${command}". Check the updated plan!`
        });
        io.to(sessionId.toString()).emit('newMessage', successMessage);

        // 7. Emit a special event to tell the frontend to refresh the main itinerary view
        io.to(sessionId.toString()).emit('itineraryUpdated', { tripId: trip._id, itinerary: newItinerary });

    } catch (error) {
        logger.error(`Failed to handle trip edit request: ${error.message}`);
        // Send an error message back to the group chat
        const errorMessage = await Message.create({
            chatSession: sessionId,
            type: 'system',
            text: `I'm sorry, I couldn't update the itinerary. There was an error processing the request.`
        });
        io.to(sessionId.toString()).emit('newMessage', errorMessage);
    }
};

function formatDetailResponse(requestType, trip, options = {}) {
    switch (requestType) {
        case 'overview':
            return `✈️ Here's an overview of your trip to **${trip.destination}** for **${trip.travelers}** traveler(s) from **${new Date(trip.startDate).toLocaleDateString()}** to **${new Date(trip.endDate).toLocaleDateString()}**. The current status of this trip is **'${trip.status}'**.`;

        case 'itinerary':
            if (options.day) {
                const dayPlan = trip.itinerary.find(d => d.day === options.day);
                return dayPlan
                    ? `🗓️ On Day ${options.day}, your plan is: **${dayPlan.title}**. Activities include: ${dayPlan.activities.join(', ')}.`
                    : `Sorry, I couldn't find a plan for Day ${options.day}.`;
            }
            return `Here is your full itinerary:\n${trip.formattedPlan || trip.itinerary.map(d => `\nDay ${d.day}: ${d.title}`).join('')}`;

        case 'budget':
            if (!trip.budget) return "No budget has been estimated for this trip yet.";
            return `💰 Your estimated budget is **₹${trip.budget.total.toLocaleString('en-IN')}**, broken down as:\n- Travel: ₹${trip.budget.travel.toLocaleString('en-IN')}\n- Stay: ₹${trip.budget.accommodation.toLocaleString('en-IN')}\n- Activities: ₹${trip.budget.activities.toLocaleString('en-IN')}\n- Food: ₹${trip.budget.food.toLocaleString('en-IN')}`;

        case 'weather':
            if (!trip.weather?.forecast?.length) return "I don't have any weather forecast information for this trip.";
            const weatherSummary = trip.weather.forecast.map(f => `\n- **${f.date}**: ${f.condition} with a high of ${f.temp_max}°C and a low of ${f.temp_min}°C.`);
            return `🌦️ Here's the weather forecast for your trip:${weatherSummary}`;

        case 'accommodation':
            if (!trip.accommodationSuggestions?.length) return "There are no specific accommodation suggestions saved for this trip.";
            const accommSummary = trip.accommodationSuggestions.map(a => `\n- **${a.name}** (Rating: ${a.rating || 'N/A'})`);
            return `🏨 Here are some accommodation suggestions:${accommSummary}`;

        case 'attractions':
            if (!trip.attractions?.length) return "I don't have a list of attractions for this trip.";
            return `🏛️ Here are some of the top attractions to visit: ${trip.attractions.map(a => a.name).join(', ')}.`;

        case 'food':
            const mustEats = trip.mustEats?.join(', ');
            const foodRecs = trip.foodRecommendations?.map(f => f.name).join(', ');
            if (!mustEats && !foodRecs) return "I don't have any food recommendations for this trip yet.";
            return `🍴 Here are some food suggestions!\n- **Must-Try Dishes:** ${mustEats || 'Not specified'}\n- **Recommended Spots:** ${foodRecs || 'Not specified'}`;

        case 'transport':
        case 'routes':
            if (!trip.route) return "Transportation route details are not available for this trip.";
            const { fastest, cheapest, details } = trip.route;
            return `🚗 Here are the transportation details:\n- **Fastest Option:** ${fastest.mode} (${fastest.duration}, ${fastest.distance})\n- **Cheapest Option:** ${cheapest.mode} (Est. cost: ${cheapest.cost}, ${cheapest.duration})`;

        case 'alerts':
            if (!trip.alerts?.length) return "✅ Good news! There are no critical safety alerts for your destination at the moment.";
            return `⚠️ **Important Alerts:**\n- ${trip.alerts.join('\n- ')}`;

        case 'events':
            if (!trip.localEvents?.length) return "I couldn't find any specific local events happening during your trip.";
            const eventSummary = trip.localEvents.map(e => `\n- **${e.name}** on ${new Date(e.date).toLocaleDateString()}`);
            return `🎟️ Here are some local events happening during your stay:${eventSummary}`;

        case 'tips':
            if (!trip.tips?.length) return "I don't have any special tips for this trip yet.";
            return `💡 Here are a few tips for your trip: ${trip.tips.join('. ')}.`;

        case 'highlights':
            if (!trip.highlights?.length) return "The trip highlights haven't been generated yet.";
            return `✨ Trip Highlights: ${trip.highlights.join(', ')}.`;

        case 'packing_list':
            if (!trip.packingChecklist?.length) return "I don't have a packing list for this trip yet.";
            return `🎒 Here's a suggested packing list: ${trip.packingChecklist.join(', ')}.`;

        default:
            return "I can provide details on your trip's **overview, itinerary, budget, weather, accommodation, attractions, food, transport, alerts, events, tips, highlights,** or **packing list**. What would you like to know?";
    }
}

const handleWaymateCommand = async (sessionId, user, command) => {
    try {
        const session = await ChatSession.findById(sessionId);
        if (!session || !session.tripId) {
            throw new Error('This chat session is not linked to a trip.');
        }
        const trip = await Trip.findById(session.tripId);
        if (!trip) {
            throw new Error('Associated trip not found.');
        }
        const isEditCommand = /add|change|remove|delete|update|move/i.test(command);

        if (isEditCommand) {
            await handleTripEditRequest(sessionId, user, command, trip);
        } else {
            const requestType = command.toLowerCase().split(' ')[0]; 
            const reply = formatDetailResponse(requestType, trip);

            const aiMessage = await Message.create({
                chatSession: sessionId,
                type: 'system',
                text: reply
            });
            notificationService.broadcastToTrip(sessionId, 'newMessage', aiMessage);
        }
    } catch (error) {
        logger.error(`Failed to handle Waymate command: ${error.message}`);
        const errorMessage = await Message.create({
            chatSession: sessionId,
            type: 'system',
            text: `I'm sorry, I ran into an error trying to process that command.`
        });
        notificationService.broadcastToTrip(sessionId, 'newMessage', errorMessage);
    }
};


module.exports = {
    handleWaymateCommand,
};