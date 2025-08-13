const ChatSession = require('../models/ChatSession');
const logger = require('../utils/logger');

/**
 * Updates the 'lastMessage' field of a chat session.
 * This is designed to be a non-blocking, "fire-and-forget" operation.
 * @param {string} sessionId The ID of the chat session to update.
 * @param {object} message The newly created message document.
 */
const updateLastMessage = async (sessionId, message) => {
    if (!sessionId || !message) return;

    try {
        await ChatSession.findByIdAndUpdate(sessionId, {
            $set: { 
                lastMessage: {
                    senderId: message.sender,
                    text: message.text || `Media: ${message.media.type || 'file'}`,
                    sentAt: message.createdAt,
                }
            }
        });
    } catch (error) {
        logger.error(`Failed to update lastMessage for session ${sessionId}`, { error: error.message });
    }
};

module.exports = { updateLastMessage };