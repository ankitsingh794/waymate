const ChatSession = require('../models/ChatSession');
const { sendResponse } = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Middleware to verify if the authenticated user is a member of the chat session.
 */
const isGroupMember = async (req, res, next) => {
    const { sessionId } = req.params;
    const userId = req.user._id;

    if (!sessionId) {
        return sendResponse(res, 400, false, 'Session ID is required.');
    }

    try {
        // Find the chat session and check if the user's ID is in the participants array.
        const session = await ChatSession.findOne({ _id: sessionId, participants: userId });

        if (!session) {
            logger.warn(`Access denied for user ${userId} to session ${sessionId}`);
            return sendResponse(res, 403, false, 'Access denied. You are not a member of this chat session.');
        }

        // If the user is a member, proceed to the next middleware or controller.
        next();
    } catch (error) {
        logger.error(`Error verifying group membership for session ${sessionId}: ${error.message}`);
        return sendResponse(res, 500, false, 'An error occurred while verifying permissions.');
    }
};

module.exports = { isGroupMember };
