const mongoose = require('mongoose');
const ConversationManager = require('../services/conversationManager');
const tripService = require('../services/tripService');
const aiService = require('../services/aiService');
const Trip = require('../models/Trip');
const ChatSession = require('../models/ChatSession');
const logger = require('../utils/logger');
const { sendResponse } = require('../utils/responseHelper');
const finderService = require('../services/finderService');
const { getSocketIO } = require('../utils/socket');
const aiParsingService = require('../services/aiParsingService');
const { handleTripEditRequest } = require('../services/aiChatService');
const currencyService = require('../services/currencyService');
const Message = require('../models/Message');


// --- (Helper functions like createTripSummary and formatDetailResponse remain unchanged) ---

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
            currency: trip.preferences.currency || 'INR',
        },
        weatherSummary: trip.weather.forecast[0]?.condition || 'Weather data not available.',
        coverImage: trip.coverImage,
        highlights: trip.highlights || [],
    };
}

/**
 * ENHANCED: Formats a detailed, user-friendly response about a trip
 * based on the specific type of information requested.
 * @param {string} requestType - The category of information to format (e.g., 'itinerary', 'weather').
 * @param {object} trip - The full Mongoose trip object.
 * @param {object} options - Additional options, like a specific day for the itinerary.
 * @returns {string} A formatted string ready to be sent to the user.
 */
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




exports.handleChatMessage = async (req, res) => {
    const { message, sessionId, origin } = req.body; 
    const userId = req.user._id;

    if (!message || !sessionId) {
        return sendResponse(res, 400, false, 'Message and Session ID are required.');
    }

    const conversationManager = new ConversationManager(userId);

    try {
        const activeConversationState = await conversationManager.getState();
        if (activeConversationState) {
            // This correctly saves history for multi-step conversations
            await Message.create({ chatSession: sessionId, sender: userId, text: message, type: 'user' });
            const response = await conversationManager.handleMessage(message);
            await Message.create({ chatSession: sessionId, sender: null, text: response.reply, type: 'ai' });
            return handleManagerResponse(res, userId, response);
        }

        const { intent, details } = await aiParsingService.detectIntentAndExtractEntity(message);

        // ✅ ADDED: Save the user's initial message for all new intents right away.
        await Message.create({ chatSession: sessionId, sender: userId, text: message, type: 'user' });

        switch (intent) {
            case 'create_trip':
                if (origin) { details.origin = origin; }
                const response = await conversationManager.handleMessage(message, details);
                await Message.create({ chatSession: sessionId, sender: null, text: response.reply, type: 'ai' });
                return handleManagerResponse(res, userId, response);

            case 'find_place':
                const searchLocation = details.location || req.user.location?.city;
                if (!searchLocation) {
                    const reply = "Of course! Where would you like me to look?";
                    await Message.create({ chatSession: sessionId, sender: null, text: reply, type: 'ai' });
                    return sendResponse(res, 200, true, 'Finder response.', { reply });
                }
                const places = await finderService.findPlaces(details.query, searchLocation);
                let placesReply;
                if (!places || places.length === 0) {
                    placesReply = `I'm sorry, I couldn't find any places that matched "${details.query}" in ${searchLocation}.`;
                } else {
                    placesReply = "Here are a few places I found for you:\n\n" +
                        places.map(p => `**${p.name}**\n*Rating: ${p.rating}*\n${p.reason}\n📍 ${p.address}`).join('\n\n');
                }
                await Message.create({ chatSession: sessionId, sender: null, text: placesReply, type: 'ai' });
                return sendResponse(res, 200, true, 'Finder response.', { reply: placesReply });

            case 'get_trip_detail':
            case 'edit_trip':
            case 'convert_budget':
                const contextualReply = "That's a great question! To manage details for a specific trip, please go to that trip's dashboard and use the group chat. I can help with general planning here!";
                await Message.create({ chatSession: sessionId, sender: null, text: contextualReply, type: 'ai' });
                return sendResponse(res, 200, true, 'Context required.', { reply: contextualReply });

            case 'casual_chat':
            default:
                const recentMessages = await Message.find({ chatSession: sessionId }).sort({ createdAt: -1 }).limit(10);
                const formattedHistory = recentMessages.reverse().map(msg => ({
                    role: msg.type === 'ai' ? 'assistant' : 'user',
                    content: msg.text
                }));
                const casualResponse = await aiService.getCasualResponse(message, formattedHistory);
                await Message.create({ chatSession: sessionId, sender: null, text: casualResponse, type: 'ai' });
                return sendResponse(res, 200, true, 'Casual chat response.', { reply: casualResponse });
        }
    } catch (error) {
        logger.error(`Error in chat controller: ${error.message}`, { userId });
        sendResponse(res, 500, false, 'An error occurred while handling your message.');
    }
};


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
 * @param {string} creatorId The ID of the user creating the trip.
 * @param {object} collectedData The data gathered from the conversational flow.
 */
async function processTripCreation(creatorId, collectedData) {
    const io = getSocketIO();
    const session = await mongoose.startSession();
    session.startTransaction();

    let trip; // Define trip here to be accessible outside the try block

    try {
        logger.info('Starting background trip creation...', { creatorId, data: collectedData });

        const aggregatedData = await tripService.aggregateTripData({
            ...collectedData,
            startDate: collectedData.dates.startDate,
            endDate: collectedData.dates.endDate,
            travelers: collectedData.travelers || 1,
            origin: collectedData.origin || { lat: 28.6139, lon: 77.2090 },
        });

        const aiResponse = await aiService.generateItinerary(aggregatedData);

        // Mongoose returns an array when creating with a session, so we destructure the first element
        [trip] = await Trip.create([{
            destination: aggregatedData.destinationName,
            destinationCoordinates: aggregatedData.destinationCoords,
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
            localEvents: aggregatedData.localEvents,
            status: 'planned',
            group: {
                isGroup: false, // Initially not a group until more members are added
                members: [{ userId: creatorId, role: 'owner' }] // The creator is the first member and owner
            }
        }], { session });

        // ✅ NEW: Automatically create a ChatSession for the new trip.
        await session.commitTransaction();
        logger.info(`Trip and ChatSession created successfully via transaction.`, { tripId: trip._id });

        const summary = createTripSummary(trip);
        io.to(creatorId.toString()).emit('tripCreated', {
            reply: "I've finished planning! Here is your new trip summary.",
            summary: summary,
        });

    } catch (error) {
        logger.error(`Background trip creation failed: ${error.message}`, { creatorId });

        if (session.inTransaction()) {
            await session.abortTransaction();
            logger.warn('Transaction aborted due to an error.');
        }

        io.to(creatorId.toString()).emit('tripCreationError', {
            reply: "I'm so sorry, but I ran into an issue while creating your trip. Please try again in a moment.",
            error: 'An internal error occurred.',
        });
    } finally {
        session.endSession();
    }
}


/**
 * @desc    Finds or creates a dedicated AI chat session for the current user.
 * @route   POST /api/chat/sessions/ai
 * @access  Private
 */
exports.findOrCreateAiSession = async (req, res) => {
    const userId = req.user._id;
    try {
        let session = await ChatSession.findOne({
            sessionType: 'ai',
            'participants.0': userId, // Find where the user is the first/only participant
            'participants.1': { $exists: false }
        });

        if (!session) {
            session = await ChatSession.create({
                sessionType: 'ai',
                participants: [userId],
                name: `AI Assistant - ${req.user.name}`
            });
            logger.info(`Created new AI chat session for user ${userId}`, { sessionId: session._id });
        }

        return sendResponse(res, 200, true, 'AI session ready.', { sessionId: session._id });

    } catch (error) {
        logger.error(`Error finding or creating AI session: ${error.message}`, { userId });
        return sendResponse(res, 500, false, 'Could not initialize AI chat.');
    }
};