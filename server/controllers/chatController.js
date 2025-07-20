
const ConversationManager = require('../services/conversationManager');
const tripService = require('../services/tripService');
const aiService = require('../services/aiService');
const Trip = require('../models/Trips');
const logger = require('../utils/logger');
const { sendResponse } = require('../utils/responseHelper');
const { getSocketIO } = require('../utils/socket'); // Import the Socket.IO instance getter

/**
 * Creates a concise summary of a newly created trip to be sent back to the user.
 * @param {object} trip The full trip object from the database.
 * @returns {object} A summary object containing key trip details.
 */
function createTripSummary(trip) {
    return {
        tripId: trip._id,
        destination: trip.destination,
        dates: {
            start: trip.startDate,
            end: trip.endDate,
        },
        budget: {
            total: trip.budget.total,
            currency: trip.preferences.currency || 'USD',
        },
        weatherSummary: trip.weather.forecast[0]?.condition || 'Weather data not available.',
        coverImage: trip.coverImage,
        highlights: trip.highlights || [],
    };
}

/**
 * Formats a specific detail from a trip object into a user-friendly string.
 * @param {string} requestType The type of detail requested (e.g., "itinerary").
 * @param {object} trip The full trip object.
 * @param {object} options Additional options, like the day number.
 * @returns {string} A formatted string to be sent to the user.
 */
function formatDetailResponse(requestType, trip, options = {}) {
    switch (requestType) {
        case 'itinerary':
            if (options.day) {
                const dayPlan = trip.itinerary.find(d => d.day === options.day);
                return dayPlan
                    ? `🗓️ On Day ${options.day}, your plan is: ${dayPlan.title}. Activities include: ${dayPlan.activities.join(', ')}.`
                    : `Sorry, I couldn't find a plan for Day ${options.day}.`;
            }
            return `Here is your full itinerary:\n${trip.formattedPlan}`;
        case 'budget':
            return `💰 Your estimated budget is $${trip.budget.total}, broken down as: Travel: $${trip.budget.travel}, Stay: $${trip.budget.accommodation}, Activities: $${trip.budget.activities}, and Food: $${trip.budget.food}.`;
        case 'food':
            return `🍴 Here are some must-try foods and restaurants: ${trip.mustEats.join(', ')}. Enjoy!`;
        case 'tips':
            return `💡 Here are a few tips for your trip: ${trip.tips.join('. ')}.`;
        case 'packing_list':
            return `🎒 Here's a suggested packing list: ${trip.packingChecklist.join(', ')}.`;
        default:
            return "I can provide details on your itinerary, budget, food, or tips. What would you like to know?";
    }
}

// --- Main Controller Logic ---

/**
 * @desc    Handles all incoming chat messages.
 * @route   POST /api/chat/message
 * @access  Private
 */
exports.handleChatMessage = async (req, res) => {
    const { message, lastTripId } = req.body; // Frontend should send the last known tripId for context
    const userId = req.user._id;

    if (!message) {
        return sendResponse(res, 400, false, 'Message is required.');
    }

    const conversationManager = new ConversationManager(userId);

    try {
        // First, check if a stateful conversation (like trip creation) is already in progress.
        const activeConversationState = await conversationManager.getState();
        if (activeConversationState) {
            const response = await conversationManager.handleMessage(message);
            return handleManagerResponse(res, userId, response);
        }

        // If no active conversation, detect the user's intent for this new message.
        const { intent, details } = await aiParsingService.detectIntentAndExtractEntity(message);

        switch (intent) {
            case 'create_trip':
                const response = await conversationManager.handleMessage(message);
                return handleManagerResponse(res, userId, response);

            case 'get_trip_detail':
                if (!lastTripId) {
                    return sendResponse(res, 400, true, "I'm not sure which trip you're referring to. Could you clarify?");
                }
                const trip = await Trip.findById(lastTripId);
                if (!trip || trip.userId.toString() !== userId.toString()) {
                    return sendResponse(res, 404, true, "I couldn't find that trip.");
                }
                const detailResponse = formatDetailResponse(details.request, trip, details.options);
                return sendResponse(res, 200, true, 'Detail retrieved.', { reply: detailResponse });

            case 'edit_trip':
                if (!lastTripId) {
                    return sendResponse(res, 400, true, "I'm not sure which trip you want to edit.");
                }
                // This is an async operation, so we notify the user and process in the background.
                sendResponse(res, 200, true, 'Edit request received.', { reply: `Got it! I'll try to apply this edit: "${details.command}"` });
                handleTripEditRequest(lastTripId, req.user, details.command); // Assumes handleTripEditRequest is adapted to take tripId
                break;

            case 'casual_chat':
            default:
                const casualResponse = await aiService.getCasualResponse(details.message); // A new function in aiService
                return sendResponse(res, 200, true, 'Casual chat response.', { reply: casualResponse });
        }
    } catch (error) {
        logger.error(`Error in chat controller: ${error.message}`, { userId });
        sendResponse(res, 500, false, 'An error occurred while handling your message.');
    }
};

/**
 * Handles the response from the ConversationManager.
 */
function handleManagerResponse(res, userId, response) {
    if (response.action === 'trigger_trip_creation') {
        sendResponse(res, 200, true, 'Conversation complete. Processing trip creation.', {
            reply: response.reply,
        });
        processTripCreation(userId, response.data);
    } else {
        sendResponse(res, 200, true, 'Conversation in progress.', {
            reply: response.reply,
        });
    }
}

/**
 * A background function to handle the full trip creation process.
 * @param {string} userId The ID of the user.
 * @param {object} collectedData The data gathered from the conversational flow.
 */
async function processTripCreation(userId, collectedData) {
    const io = getSocketIO();
    try {
        logger.info('Starting background trip creation...', { userId, data: collectedData });

        const aggregatedData = await tripService.aggregateTripData({
            ...collectedData,
            travelers: collectedData.travelers || 1,
            origin: collectedData.origin || { lat: 28.6139, lon: 77.2090 },
        });

        const aiResponse = await aiService.generateItinerary(aggregatedData);

        const trip = await Trip.create({
            userId,
            destination: aggregatedData.destinationName,
            startDate: aggregatedData.startDate,
            endDate: aggregatedData.endDate,
            travelers: aggregatedData.travelers,
            preferences: aggregatedData.preferences,
            coverImage: aggregatedData.coverImage,
            route: aggregatedData.route,
            weather: aggregatedData.weather,
            attractions: aggregatedData.attractions,
            foodRecommendations: aggregatedData.foodRecommendations,
            accommodationSuggestions: aggregatedData.accommodationSuggestions,
            budget: aggregatedData.budget,
            alerts: aggregatedData.alerts,
            itinerary: aiResponse.itinerary,
            formattedPlan: aiResponse.formattedText,
            tips: aiResponse.tips,
            mustEats: aiResponse.mustEats,
            highlights: aiResponse.highlights,
            packingChecklist: aiResponse.packingChecklist,
            status: 'planned',
        });

        logger.info(`Trip created successfully in the background.`, { tripId: trip._id });

        const summary = createTripSummary(trip);

        // Push the final summary to the user via their personal WebSocket room.
        io.to(userId.toString()).emit('tripCreated', {
            reply: "I've finished planning! Here is the summary of your trip. Ask me for more details!",
            summary: summary,
        });

    } catch (error) {
        logger.error(`Background trip creation failed: ${error.message}`, { userId });

        // Notify the user of the failure via their personal WebSocket room.
        io.to(userId.toString()).emit('tripCreationError', {
            reply: "I'm so sorry, but I ran into an issue while creating your trip plan. Please try again in a moment.",
            error: error.message,
        });
    }
}
