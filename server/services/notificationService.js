const { getSocketIO } = require('../utils/socket');
const logger = require('../utils/logger');
// const emailService = require('./emailService');


const socketChannel = {
  /**
   * Emits a generic message to a user's private room.
   * @param {string} userId - The ID of the user to notify.
   * @param {string} event - The name of the socket event (e.g., 'tripCreated').
   * @param {object} payload - The data to send with the event.
   */
  emitToUser(userId, event, payload) {
    try {
      const io = getSocketIO();
      if (io) {
        io.to(userId.toString()).emit(event, payload);
        logger.info(`Socket event '${event}' emitted to user ${userId}`);
      }
    } catch (error) {
      logger.error('Socket emit failed', { event, userId, error: error.message });
    }
  },

  /**
   * Broadcasts a message to all members of a specific trip's chat room.
   * @param {string} tripId - The ID of the trip/room.
   * @param {string} event - The name of the socket event.
   * @param {object} payload - The data to send.
   */
  broadcastToTrip(tripId, event, payload) {
    try {
      const io = getSocketIO();
      if (io) {
        io.to(tripId.toString()).emit(event, payload);
        logger.info(`Socket event '${event}' broadcast to trip ${tripId}`);
      }
    } catch (error) {
      logger.error('Socket broadcast failed', { event, tripId, error: error.message });
    }
  }
};


/**
 * =============================================================================
 * SECTION: Email Notification Channel (Future Placeholder)
 * =============================================================================
 * Placeholder for handling transactional emails.
 */
const emailChannel = {
  /**
   * Sends a pre-formatted email.
   * @param {string} userEmail - The recipient's email address.
   * @param {string} templateId - The ID of the email template to use.
   * @param {object} data - The data to populate the template with.
   */
  sendEmail(userEmail, templateId, data) {
    logger.info(`[Email Placeholder] Sending email '${templateId}' to ${userEmail}`);
    // In the future, this would call your actual email service:
    // return emailService.send(userEmail, templateId, data);
    return Promise.resolve();
  }
};


/**
 * =============================================================================
 * SECTION: Public Notification Functions
 * =============================================================================
 * These are the functions that other services will call. They orchestrate
 * sending notifications across one or more channels.
 */

/**
 * Notifies a user that a trip has been successfully created.
 * @param {string} userId - The ID of the user who created the trip.
 * @param {object} tripSummary - A summary object of the created trip.
 */
const sendTripSuccess = (userId, tripSummary) => {
  const payload = {
    reply: "I've finished planning! Here is your new trip summary.",
    summary: tripSummary,
  };
  // Send the primary notification via WebSocket
  socketChannel.emitToUser(userId, 'tripCreated', payload);
  // In the future, you could also send a confirmation email
  // emailChannel.sendEmail(user.email, 'trip-creation-success', { tripSummary });
};

/**
 * Notifies a user that a trip creation process has failed.
 * @param {string} userId - The ID of the user who initiated the process.
 * @param {string} customMessage - The user-friendly error message to send.
 */
const sendTripError = (userId, customMessage) => {
  const payload = {
    reply: customMessage,
  };
  socketChannel.emitToUser(userId, 'tripCreationError', payload);
};

/**
 * Notifies all members of a trip that the itinerary has been updated.
 * @param {string} tripId - The ID of the trip.
 * @param {object} newItinerary - The updated itinerary object.
 */
const sendItineraryUpdate = (tripId, newItinerary) => {
    const payload = {
        tripId: tripId,
        itinerary: newItinerary
    };
    socketChannel.broadcastToTrip(tripId, 'itineraryUpdated', payload);
};


module.exports = {
  sendTripSuccess,
  sendTripError,
  sendItineraryUpdate,
};