const logger = require('../utils/logger');
const Message = require('../models/Message');
const ChatSession = require('../models/ChatSession');
const Trip = require('../models/Trips');
const { getSocketIO } = require('../utils/socket');
const axios = require('axios');

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

module.exports = {
    handleTripEditRequest,
};