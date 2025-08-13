const logger = require('../utils/logger');
const sendEmail = require('../utils/sendEmail'); 
const { generateTripReadyEmailHTML } = require('../utils/emailTemplates');
const Message = require('../models/Message');


let io = null;

const initNotificationService = (socketIoInstance) => {
    io = socketIoInstance;
    logger.info('✅ Notification service initialized.');
};

// --- Socket.IO Channel ---
const socketChannel = {
  emitToUser(userId, event, payload) {
    if (!io) return logger.warn(`Socket.IO not initialized. Cannot emit '${event}'.`);
    if (typeof payload !== 'object' || payload === null) {
      return logger.error(`Invalid payload for socket event '${event}'. Must be an object.`);
    }
    io.to(userId.toString()).emit(event, payload);
    logger.info(`Socket event '${event}' emitted to user ${userId}`);
  },
  broadcastToTrip(tripId, event, payload) {
    if (!io) return logger.warn(`Socket.IO not initialized. Cannot broadcast '${event}'.`);
    if (typeof payload !== 'object' || payload === null) {
      return logger.error(`Invalid payload for socket event '${event}'. Must be an object.`);
    }
    io.to(tripId.toString()).emit(event, payload);
    logger.info(`Socket event '${event}' broadcast to trip ${tripId}`);
  }
};

// --- Email Channel ---
const emailChannel = {
  async sendTripReadyEmail(user, tripSummary) {
    try {
        const html = generateTripReadyEmailHTML(user.name, tripSummary);
        await sendEmail({
            to: user.email,
            subject: `Your Itinerary for ${tripSummary.destinationName} is Here!`,
            html: html,
            text: `Hi ${user.name}, your trip plan for ${tripSummary.destinationName} is ready! View it in the app.`
        });
        logger.info(`Trip ready confirmation email sent to ${user.email}`);
    } catch (error) {
        logger.error('Failed to send trip ready email', { error: error.message, userId: user._id });
    }
  }
};

// --- Public Notification Functions ---

const sendTripSuccess = (user, tripSummary) => {
  socketChannel.emitToUser(user._id, 'tripCreated', {
    reply: "I've finished planning! Here is your new trip summary.",
    summary: tripSummary,
  });

  emailChannel.sendTripReadyEmail(user, tripSummary);
};

const sendTripError = (userId, customMessage) => {
  socketChannel.emitToUser(userId, 'tripCreationError', { reply: customMessage });
};

const sendItineraryUpdate = (tripId, newItinerary) => {
    socketChannel.broadcastToTrip(tripId, 'itineraryUpdated', { tripId, itinerary: newItinerary });
};

const sendStatusUpdate = (userId, message) => {
  socketChannel.emitToUser(userId, 'statusUpdate', { text: message });
};

/**
 * --- NEW FUNCTION ---
 * Creates a system message, saves it to the DB, and broadcasts it to the trip chat.
 * @param {string} tripId - The ID of the chat session/trip.
 * @param {string} text - The content of the system message.
 * @param {string} [messageType='system'] - The type of message (e.g., 'system', 'error').
 */
const sendSystemMessageToTrip = async (tripId, text, messageType = 'system') => {
    try {
        const message = await Message.create({
            chatSession: tripId,
            type: messageType,
            text: text,
        });
        // Use the existing socket channel to broadcast the new message
        socketChannel.broadcastToTrip(tripId, 'newMessage', message);
    } catch (error) {
        logger.error('Failed to create and send system message', { error: error.message, tripId });
    }
};

module.exports = {
  initNotificationService,
  sendTripSuccess,
  sendTripError,
  sendItineraryUpdate,
  sendStatusUpdate,
  sendSystemMessageToTrip,
  broadcastToTrip: socketChannel.broadcastToTrip,
  emitToUser: socketChannel.emitToUser,
};