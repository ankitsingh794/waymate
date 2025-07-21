const mongoose = require('mongoose');
const ConversationManager = require('../services/conversationManager');
const tripService = require('../services/tripService');
const aiService = require('../services/aiService');
const Trip = require('../models/Trip');
const ChatSession = require('../models/ChatSession'); 
const logger = require('../utils/logger');
const { sendResponse } = require('../utils/responseHelper');
const { getSocketIO } = require('../utils/socket');
const aiParsingService = require('../services/aiParsingService');
const { handleTripEditRequest } = require('../services/aiChatService');
const currencyService = require('../services/currencyService');


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

function formatDetailResponse(requestType, trip, options = {}) {
    switch (requestType) {
        case 'itinerary':
            if (options.day) {
                const dayPlan = trip.itinerary.find(d => d.day === options.day);
                return dayPlan
                    ? `🗓️ On Day ${options.day}, your plan is: ${dayPlan.title}. Activities include: ${dayPlan.activities.map(a => a.name || a).join(', ')}.`
                    : `Sorry, I couldn't find a plan for Day ${options.day}.`;
            }
            return `Here is your full itinerary:\n${trip.formattedPlan}`;
        case 'budget':
            return `💰 Your estimated budget is ₹${trip.budget.total.toLocaleString('en-IN')}, broken down as: Travel: ₹${trip.budget.travel.toLocaleString('en-IN')}, Stay: ₹${trip.budget.accommodation.toLocaleString('en-IN')}, Activities: ₹${trip.budget.activities.toLocaleString('en-IN')}, and Food: ₹${trip.budget.food.toLocaleString('en-IN')}.`;
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

exports.handleChatMessage = async (req, res) => {
    const { message, lastTripId } = req.body;
    const userId = req.user._id;

    if (!message) {
        return sendResponse(res, 400, false, 'Message is required.');
    }

    const conversationManager = new ConversationManager(userId);

    try {
        const activeConversationState = await conversationManager.getState();
        if (activeConversationState) {
            const response = await conversationManager.handleMessage(message);
            return handleManagerResponse(res, userId, response);
        }

        const { intent, details } = await aiParsingService.detectIntentAndExtractEntity(message);

        switch (intent) {
            case 'create_trip':
                const response = await conversationManager.handleMessage(message);
                return handleManagerResponse(res, userId, response);

            case 'get_trip_detail':
                if (!lastTripId) {
                    return sendResponse(res, 400, true, "I'm not sure which trip you're referring to. Could you clarify?");
                }
                const trip = await Trip.findOne({ _id: lastTripId, 'group.members.userId': userId });
                if (!trip) {
                    return sendResponse(res, 404, true, "I couldn't find that trip or you're not a member.");
                }
                const detailResponse = formatDetailResponse(details.request, trip, details.options);
                return sendResponse(res, 200, true, 'Detail retrieved.', { reply: detailResponse });

            case 'edit_trip':
                if (!lastTripId) {
                    return sendResponse(res, 400, true, "I'm not sure which trip you want to edit.");
                }
                sendResponse(res, 200, true, 'Edit request received.', { reply: `Got it! I'll try to apply this edit: "${details.command}"` });
                // Find the associated chat session to pass to the edit service
                const chatSessionForEdit = await ChatSession.findOne({ tripId: lastTripId });
                if (chatSessionForEdit) {
                    handleTripEditRequest(chatSessionForEdit._id.toString(), req.user, details.command);
                }
                break;

            case 'convert_budget':
                if (!lastTripId) {
                    return sendResponse(res, 400, true, "I'm not sure which trip you're referring to. Could you clarify?");
                }
                const tripForConversion = await Trip.findOne({ _id: lastTripId, 'group.members.userId': userId });
                if (!tripForConversion) {
                    return sendResponse(res, 404, true, "I couldn't find that trip or you're not a member.");
                }

                const targetCurrency = details.currency.toUpperCase();
                const conversionResult = await currencyService.convertCurrency(
                    tripForConversion.budget.total,
                    'INR', // Assuming the base budget is always in INR
                    targetCurrency
                );

                if (!conversionResult) {
                    return sendResponse(res, 500, true, `Sorry, I couldn't get the conversion rate for ${targetCurrency} right now.`);
                }

                const reply = `Of course! The total estimated budget of ₹${tripForConversion.budget.total.toLocaleString('en-IN')} is approximately **${targetCurrency} ${conversionResult.convertedAmount.toLocaleString()}**.`;
                return sendResponse(res, 200, true, 'Budget converted successfully.', { reply });


            case 'casual_chat':
            default:
                const casualResponse = await aiService.getCasualResponse(details.message);
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
    session.startTransaction()

    try {
        logger.info('Starting background trip creation...', { creatorId, data: collectedData });

        const aggregatedData = await tripService.aggregateTripData({
            ...collectedData,
            travelers: collectedData.travelers || 1,
            origin: collectedData.origin || { lat: 28.6139, lon: 77.2090 },
        });

        const aiResponse = await aiService.generateItinerary(aggregatedData);

        // ✅ MODIFICATION: Create the trip with the new group structure.
        const trip = await Trip.create([{
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
        await ChatSession.create([{
            tripId: trip._id,
            participants: [creatorId],
            name: `${trip.destination} Trip Group`
        }], { session });

        await session.commitTransaction();

        logger.info(`Trip and ChatSession created successfully via transaction.`, { tripId: trip._id });
        const summary = createTripSummary(trip);
        io.to(creatorId.toString()).emit('tripCreated', {
            reply: "I've finished planning! Here is your new trip summary.",
            summary: summary,
        });

    } catch (error) {
        // If any error occurs, abort the transaction
        await session.abortTransaction();
        logger.error(`Background trip creation failed and rolled back: ${error.message}`, { creatorId });

        // FIX: Send a generic, safe error message to the client.
        io.to(creatorId.toString()).emit('tripCreationError', {
            reply: "I'm so sorry, but I ran into an issue while creating your trip. Please try again in a moment.",
            error: 'An internal error occurred.', // Do not leak error.message
        });
    } finally {
        // End the session
        session.endSession();
    }
}
