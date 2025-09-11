const mongoose = require('mongoose');
const ConversationManager = require('../services/conversationManager');
const tripService = require('../services/tripService');
const aiService = require('../services/aiService');
const Trip = require('../models/Trip');
const ChatSession = require('../models/ChatSession');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { handleWaymateCommand } = require('../services/aiChatService');
const finderService = require('../services/finderService');
const aiParsingService = require('../services/aiParsingService');
const Message = require('../models/Message');
const notificationService = require('../services/notificationService');
const { invalidateUserCache } = require('../services/cacheInvalidationService')
const { updateLastMessage } = require('../services/chatService');



async function handleNewTripIntent(req, res, conversationManager, message, details, userMessageId) {
    if (req.body.origin) { details.origin = req.body.origin; }
    const response = await conversationManager.handleMessage(message, details);
    const aiMessage = await Message.create({
        chatSession: req.body.sessionId,
        sender: null,
        text: response.reply,
        type: 'ai',
        inReplyTo: userMessageId
    });
    if (response.action === 'trigger_trip_creation' && req.body.origin) {
        response.data.origin = req.body.origin;
    }

    updateLastMessage(req.body.sessionId, aiMessage);
    notificationService.emitToUser(req.user._id, 'newMessage', aiMessage);
    return handleManagerResponse(res, req.user, response);
}

async function handleFinderIntent(req, res, details, userMessageId, liveOrigin) {
    const searchLocationCoords = liveOrigin;
    const searchLocationName = details.location || req.user.location?.city || "your area";

    let reply;
    const places = await finderService.findPlaces(details.query, searchLocationName, searchLocationCoords);

    if (!places || places.length === 0) {
        reply = `I'm sorry, I couldn't find any places matching "${details.query}" near ${searchLocationName}.`;
    } else {
        reply = `Here are a few ${details.query} I found near ${searchLocationName}:\n\n` +
            places.map(p => `**${p.name}**\n*Rating: ${p.rating || 'N/A'}*\n${p.reason}\n📍 ${p.address}`).join('\n\n');
    }

    await createAndUpdateAiReply(req.body.sessionId, reply, userMessageId, req.user._id);
    return sendSuccess(res, 200, 'Finder response sent via socket.');
}


async function handleCasualChatIntent(req, res, message, userMessageId) {
    const { sessionId } = req.body;
    const recentMessages = await Message.find({ chatSession: sessionId }).sort({ createdAt: -1 }).limit(10);
    const formattedHistory = recentMessages.reverse().map(msg => ({
        role: msg.type === 'ai' ? 'assistant' : 'user',
        content: msg.text
    }));
    const casualResponse = await aiService.getCasualResponse(message, formattedHistory);
    const aiMessage = await Message.create({ chatSession: sessionId, sender: null, text: casualResponse, type: 'ai', inReplyTo: userMessageId });
    updateLastMessage(req.body.sessionId, aiMessage);
    notificationService.emitToUser(req.user._id, 'newMessage', aiMessage);
    return sendSuccess(res, 200, 'Casual chat response sent via socket.');
}

async function createAndUpdateAiReply(sessionId, replyText, inReplyTo, userId) {
    const aiMessage = await Message.create({
        chatSession: sessionId,
        sender: null,
        text: replyText,
        type: 'ai',
        inReplyTo: inReplyTo
    });
    updateLastMessage(sessionId, aiMessage);
    notificationService.emitToUser(userId, 'newMessage', aiMessage);
    return aiMessage;
}

async function handleTravelAdviceIntent(req, res, details, userMessageId) {
    const { topic, destination } = details;
    const { sessionId } = req.body;

    const advicePrompt = `As a travel expert, briefly answer the following question: "${topic} in ${destination}"`;
    const advice = await aiService.getCasualResponse(advicePrompt);

    await createAndUpdateAiReply(sessionId, advice, userMessageId, req.user._id);
    return sendSuccess(res, 200, 'Travel advice provided.');
}

async function handleBudgetEstimateIntent(req, res, details, userMessageId) {
    const { destination, duration, travelers, budget } = details;
    const { sessionId } = req.body;

    let reply;
    if (!destination || !duration) {
        reply = "I can definitely help with a budget estimate! To get started, please tell me the destination and for how many days you're planning the trip.";
    } else {
        const days = parseInt(duration.match(/\d+/)[0] || 1, 10);
        const numTravelers = travelers || 1;
        const budgetTier = budget || 'standard';
        const costPerDay = { budget: 4000, standard: 8000, luxury: 20000 }[budgetTier];
        const totalCost = days * numTravelers * costPerDay;

        reply = `A rough estimate for a ${duration}, ${budgetTier}-style trip to ${destination} for ${numTravelers} person(s) would be around **₹${totalCost.toLocaleString('en-IN')}**. This is just a ballpark figure for accommodation, food, and activities.`;
    }

    await createAndUpdateAiReply(sessionId, reply, userMessageId, req.user._id);
    return sendSuccess(res, 200, 'Budget estimate provided.');
}

exports.handleChatMessage = async (req, res) => {
    const { message, origin } = req.body;
    const sessionId = req.params.sessionId || req.body.sessionId; 
    const userId = req.user._id;

     if (!sessionId) {
        return sendError(res, 400, 'Session ID is required.');
    }

    try {
        const userMessage = await Message.create({ chatSession: sessionId, sender: userId, text: message, type: 'user' });
        notificationService.emitToUser(userId, 'newMessage', userMessage);

        updateLastMessage(sessionId, userMessage);

        const conversationManager = new ConversationManager(userId);
        if (await conversationManager.getState()) {
            const response = await conversationManager.handleMessage(message);
            const aiMessage = await Message.create({ chatSession: sessionId, sender: null, text: response.reply, type: 'ai', inReplyTo: userMessage._id });
            updateLastMessage(sessionId, aiMessage);
            notificationService.emitToUser(userId, 'newMessage', aiMessage);
            return handleManagerResponse(res, req.user, response);
        }

        const { intent, details } = await aiParsingService.detectIntentAndExtractEntity(message);


        if (intent === 'get_trip_detail' || intent === 'edit_trip') {
            const latestTrip = await Trip.findOne({ 'group.members.userId': userId }).sort({ createdAt: -1 });
            if (latestTrip) {
                const latestTripSession = await ChatSession.findOne({ tripId: latestTrip._id });
                if (latestTripSession) {
                    if (intent === 'get_trip_detail') {
                        handleWaymateCommand(latestTripSession, req.user, intent, details);
                    }
                    const contextualReply = `That sounds like a question about your trip to ${latestTrip.destination}. For complex edits, it's best to use the dedicated group chat for that trip.`;
                    const aiMessage = await Message.create({ chatSession: sessionId, sender: null, text: contextualReply, type: 'ai', inReplyTo: userMessage._id });
                    updateLastMessage(sessionId, aiMessage);
                    notificationService.emitToUser(userId, 'newMessage', aiMessage);
                    return sendSuccess(res, 200, 'Context required.');
                }
            }
        }

        switch (intent) {
            case 'create_trip':
                req.body.sessionId = sessionId; 
                return handleNewTripIntent(req, res, conversationManager, message, details, userMessage._id);
            case 'find_place':
                return handleFinderIntent(req, res, details, userMessage._id, origin);
            case 'suggest_destination':
                const suggestReply = "That sounds like a fun trip! I can give the best recommendations if you have a destination in mind. Where are you thinking of going?";
                await createAndUpdateAiReply(sessionId, suggestReply, userMessage._id, userId);
                return sendSuccess(res, 200, 'Suggestion provided.');

            case 'get_travel_advice':
                return handleTravelAdviceIntent(req, res, details, userMessage._id);

            case 'estimate_budget':
                return handleBudgetEstimateIntent(req, res, details, userMessage._id);

            case 'find_transport':
            case 'plan_day_trip':
                const comingSoonReply = `Thanks for asking! The ability to plan ${intent === 'plan_day_trip' ? 'day trips' : 'transport'} is a feature I'm currently learning. For now, I can help you plan a full multi-day trip!`;
                await createAndUpdateAiReply(sessionId, comingSoonReply, userMessage._id, userId);
                return sendSuccess(res, 200, 'Feature in development response sent.');

            case 'casual_chat':
            default:
                return handleCasualChatIntent(req, res, message, userMessage._id);
        }
    } catch (error) {
        logger.error(`Error in chat controller: ${error.message}`, { userId });
        sendError(res, 500, 'An error occurred while handling your message.');
    }
};


/**
 * @desc    Handles incoming messages for a trip's group chat.
 * @route   POST /api/chat/message/group
 * @access  Private (isChatMember middleware)
 */
exports.handleGroupChatMessage = async (req, res, next) => {
    const { message, sessionId } = req.body;
    const AI_TRIGGER_WORD = '@WayMate';

    try {
        const session = await ChatSession.findById(sessionId);
        if (!session || !session.tripId) {
            return next(new AppError('Group chat session not found.', 404));
        }
        const userMessage = await Message.create({ chatSession: sessionId, sender: req.user._id, text: message, type: 'user' });
        updateLastMessage(sessionId, userMessage);
        notificationService.broadcastToTrip(sessionId, 'newMessage', userMessage);

        if (message.trim().startsWith(AI_TRIGGER_WORD)) {
            logger.info(`AI command detected in group chat ${sessionId}.`);

            const commandText = message.replace(AI_TRIGGER_WORD, '').trim();

            const { intent, details } = await aiParsingService.detectIntentAndExtractEntity(commandText);

            if (intent === 'edit_trip' || intent === 'get_trip_detail') {
                handleWaymateCommand(session, req.user, intent, details);
            } else {
                const reply = "I can help with editing the trip or providing details about it. For other requests, please chat with me privately.";
                notificationService.sendSystemMessageToTrip(sessionId, reply);
            }
        }

        return sendSuccess(res, 200, 'Message processed.');

    } catch (error) {
        next(error);
    }
};



function handleManagerResponse(res, user, response) {
    if (response.action === 'trigger_trip_creation') {
        sendSuccess(res, 200, 'Conversation complete. Processing trip creation.');
        processTripCreation(user, response.data);
    } else {
        sendSuccess(res, 200, 'Conversation in progress.');
    }
}

function createTripSummary(trip) {
    return {
        _id: trip._id,
        destinationName: trip.destination,
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
        highlights: trip.aiSummary?.highlights || [],
    };
}


/**
 * A background function to handle the full trip creation process.
 * @param {string} creatorId The ID of the user creating the trip.
 * @param {object} collectedData The data gathered from the conversational flow.
 */
async function processTripCreation(creator, collectedData) {
    logger.info('\n--- [DEBUG] Background Trip Creation Initiated ---');
    logger.info(`[DEBUG Step 1/7] Received data for user ${creator.email}:`, collectedData);

    let session;
    let trip;

    try {
        notificationService.sendStatusUpdate(creator._id, 'I have all the details. Now planning your adventure to ' + collectedData.destination + '...');
        logger.info('[DEBUG Step 2/7] Status update sent to client.');

        // FIX: Create a clean, normalized origin coordinate object.
        let originCoords = null;
        if (collectedData.origin?.lat && collectedData.origin?.lon) {
            // Use the live location if provided by the frontend.
            originCoords = { lat: collectedData.origin.lat, lon: collectedData.origin.lon };
        } else if (creator.location?.point?.coordinates?.length === 2) {
            // Fallback to the user's saved profile location, converting from [lon, lat] to {lat, lon}.
            originCoords = { lat: creator.location.point.coordinates[1], lon: creator.location.point.coordinates[0] };
        }

        if (!originCoords) {
            throw new Error('User origin location could not be determined.');
        }

        const aggregatedData = await tripService.aggregateTripData({
            ...collectedData,
            startDate: collectedData.dates.startDate,
            endDate: collectedData.dates.endDate,
            origin: originCoords, // Pass the clean coordinates object.
            preferences: collectedData.preferences
        });

        

        logger.info('[DEBUG Step 4/7] Trip data successfully aggregated from external APIs.');

        if (collectedData.purpose === 'leisure' || !collectedData.purpose) {
            // Use the full AI service for leisure trips or if purpose is unknown
            logger.info('[DEBUG Step 5/7] Generating itinerary via full AI Service for leisure trip.');
            aiResponse = await aiService.generateItinerary(aggregatedData);
        } else {
            // Use the fast, template-based generator for all other purposes
            logger.info(`[DEBUG Step 5/7] Generating itinerary via template for '${collectedData.purpose}' trip.`);
            aiResponse = tripService.generateTemplateItinerary(aggregatedData);
        };

        const formattedItinerary = aiResponse.itinerary.map((item, index) => ({
            ...item,
            type: 'activity', // Set the required 'type' field (defaulting to 'activity')
            sequence: index   // Set the required 'sequence' field
        }));

        session = await mongoose.startSession();
        await session.withTransaction(async () => {
            [trip] = await Trip.create([{
                origin: { coords: originCoords },
                destination: aggregatedData.destinationName,
                destinationCoordinates: aggregatedData.destinationCoords,
                startDate: aggregatedData.startDate,
                endDate: aggregatedData.endDate,
                travelers: aggregatedData.travelers,
                preferences: aggregatedData.preferences,
                coverImage: aggregatedData.coverImage,
                routeInfo: aggregatedData.routeInfo,
                weather: aggregatedData.weather,
                attractions: aggregatedData.attractions,
                foodRecommendations: aggregatedData.foodRecommendations,
                accommodationSuggestions: aggregatedData.accommodationSuggestions,
                budget: aggregatedData.budget,
                alerts: aggregatedData.alerts,
                itinerary: formattedItinerary,
                aiSummary: aiResponse.aiSummary,
                status: 'planned',
                purpose: collectedData.purpose,
                householdId: creator.householdId || null,
                group: {
                    isGroup: aggregatedData.travelers > 1,
                    members: [{
                        userId: creator._id,
                        role: 'owner',
                        ageGroup: collectedData.creatorAgeGroup,
                        gender: collectedData.creatorGender
                    }]
                }
            }], { session });
            logger.info(`[DEBUG Step 6/7] Trip document created in database with ID: ${trip._id}`);

            await ChatSession.create([{
                sessionType: 'group',
                tripId: trip._id,
                participants: [creator._id],
                name: `Trip to ${trip.destination}`
            }], { session });
            logger.info('[DEBUG Step 7/7] Associated chat session created.');
        });

        logger.info('[DEBUG SUCCESS] Transaction completed successfully.');

        if (trip) {
            await invalidateUserCache(creator._id);
            notificationService.sendTripSuccess(creator, createTripSummary(trip));
        }

    } catch (error) {
        logger.error(`FATAL: Background trip creation failed: ${error.message}`, { creatorId: creator._id, stack: error.stack });
        const userMessage = error.userMessage || "I'm sorry, I ran into an issue while creating your trip plan. Please try again later.";
        notificationService.sendTripError(creator._id, userMessage);
    } finally {
        if (session) {
            session.endSession();
        }
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
            participants: [userId]
        });

        if (!session) {
            session = await ChatSession.create({
                sessionType: 'ai',
                participants: [userId],
                name: `AI Assistant - ${req.user.name}`
            });
            logger.info(`Created new AI chat session for user ${userId}`, { sessionId: session._id });
        } else {
            logger.info(`Found existing AI chat session for user ${userId}`, { sessionId: session._id });
        }

        return sendSuccess(res, 200, 'AI session ready.', { sessionId: session._id });

    } catch (error) {
        logger.error(`Error finding or creating AI session: ${error.message}`, { userId });
        return sendError(res, 500, 'Could not initialize AI chat.');
    }
};

/**
 * @desc    Deletes all messages from a user's 1-on-1 AI chat session.
 * @route   POST /api/chat/sessions/ai/clear
 * @access  Private
 */
exports.clearAiChatHistory = async (req, res) => {
    const userId = req.user._id;
    try {
        const session = await ChatSession.findOne({
            sessionType: 'ai',
            participants: [userId]
        });

        if (session) {
            await Message.deleteMany({ chatSession: session._id });
            logger.info(`Cleared chat history for user ${userId} in session ${session._id}`);
        }

        return sendSuccess(res, 200, 'Chat history cleared successfully.');

    } catch (error) {
        logger.error(`Error clearing AI chat history for user ${userId}: ${error.message}`);
        return sendError(res, 500, 'Failed to clear chat history.');
    }
};

// Add this new function to controllers/chatController.js

/**
 * @desc    Gets all group chat sessions for the authenticated user.
 * @route   GET /api/chat/sessions/group
 * @access  Private
 */
exports.getGroupSessions = async (req, res) => {
    const userId = req.user._id;
    try {
        const groupSessions = await ChatSession.find({
            sessionType: 'group',
            participants: userId
        })
            .populate('tripId', 'destination startDate endDate coverImage') // Populate with useful trip info
            .sort({ 'lastMessage.sentAt': -1 }); // Show the most recent chats first

        logger.info(`Fetched ${groupSessions.length} group sessions for user ${userId}`);

        return sendSuccess(res, 200, 'Group sessions fetched successfully.', { sessions: groupSessions });

    } catch (error) {
        logger.error(`Error fetching group sessions for user ${userId}: ${error.message}`);
        return sendError(res, 500, 'Failed to fetch group sessions.');
    }
};