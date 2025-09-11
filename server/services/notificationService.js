const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const Trip = require('../models/Trip'); // Assuming you have a Trip model
const logger = require('../utils/logger');
const sendEmail = require('../utils/sendEmail'); 
const { generateTripReadyEmailHTML } = require('../utils/emailTemplates');

let io = null;

const initNotificationService = (socketIoInstance) => {
    io = socketIoInstance;
    logger.info('✅ Notification service initialized.');
};

// --- CORE: Centralized Notification Creation and Dispatch ---

/**
 * The primary engine of the notification service. It creates a notification
 * in the database and dispatches it in real-time via WebSockets.
 * @param {object} notificationData - The data for the notification.
 * @returns {Promise<object|null>} The created notification object or null if failed.
 */
const createAndDispatchNotification = async (notificationData) => {
    // 1. Validate required fields
    if (!notificationData.user || !notificationData.message) {
        logger.error('Notification failed: Missing user or message.', { data: notificationData });
        return null;
    }

    try {
        // 2. Save the notification to the database
        const notification = await Notification.create(notificationData);
        logger.info(`Notification created in DB for user ${notificationData.user}`);

        // 3. Dispatch the notification via WebSocket in real-time
        if (io) {
            io.to(notification.user.toString()).emit('newNotification', notification);
            logger.info(`Socket event 'newNotification' emitted to user ${notification.user}`);
        } else {
            logger.warn(`Socket.IO not initialized. Cannot emit 'newNotification'.`);
        }

        return notification;
    } catch (error) {
        logger.error('Failed to create and dispatch notification', { 
            error: error.message, 
            userId: notificationData.user 
        });
        return null;
    }
};

// --- Public-Facing Notification Triggers ---

/**
 * Notifies a user that their trip has been successfully created.
 * @param {object} user - The user object.
 * @param {object} tripSummary - The summary of the created trip.
 */
const sendTripSuccess = async (user, tripSummary) => {
  const message = `Your trip to ${tripSummary.destinationName} is ready!`;
  
  await createAndDispatchNotification({
    user: user._id,
    message: message,
    type: 'trip',
    tripId: tripSummary._id,
    link: `/trips/${tripSummary._id}` // Example deep link for the app
  });

  // Additional channels (like email) can still be used
  try {
    const html = generateTripReadyEmailHTML(user.name, tripSummary);
    await sendEmail({
        to: user.email,
        subject: `Your Itinerary for ${tripSummary.destinationName} is Here!`,
        html: html,
    });
    logger.info(`Trip ready confirmation email sent to ${user.email}`);
  } catch (error) {
    logger.error('Failed to send trip ready email', { error: error.message, userId: user._id });
  }
};

/**
 * Notifies a user about an error during trip creation.
 * @param {string} userId - The ID of the user to notify.
 * @param {string} customMessage - The error message to send.
 */
const sendTripError = async (userId, customMessage) => {
  await createAndDispatchNotification({
    user: userId,
    message: customMessage,
    type: 'alert',
    priority: 'high'
  });
};

/**
 * Notifies all members of a trip that the itinerary has been updated.
 * @param {string} tripId - The ID of the trip.
 * @param {string} updatedByUserId - The ID of the user who made the update (to avoid notifying them).
 */
const sendItineraryUpdate = async (tripId, updatedByUserId) => {
    try {
        const trip = await Trip.findById(tripId).select('members').lean();
        if (!trip) return logger.warn(`Trip not found for itinerary update notification: ${tripId}`);

        const message = "The trip itinerary has been updated.";

        // Create a notification for each member of the trip except the one who made the change
        const promises = trip.members
            .filter(memberId => memberId.toString() !== updatedByUserId.toString())
            .map(memberId => createAndDispatchNotification({
                user: memberId,
                message: message,
                type: 'trip',
                tripId: tripId,
                link: `/trips/${tripId}`
            }));
            
        await Promise.all(promises);

        // Broadcast the updated data to the trip's socket room
        if (io) io.to(tripId.toString()).emit('itineraryUpdated', { tripId });

    } catch (error) {
        logger.error('Failed to send itinerary update notifications', { error: error.message, tripId });
    }
};

/**
 * Creates a system message in a trip's chat and notifies all members.
 * @param {string} tripId - The ID of the trip.
 * @param {string} text - The content of the system message.
 */
const sendSystemMessageToTrip = async (tripId, text) => {
    try {
        // 1. Create the chat message itself
        const message = await Message.create({
            chatSession: tripId,
            type: 'system',
            text: text,
        });

        if (io) io.to(tripId.toString()).emit('newMessage', message);
        
        // 2. Create a persistent notification for all trip members
        const trip = await Trip.findById(tripId).select('members').lean();
        if (!trip) return logger.warn(`Trip not found for system message notification: ${tripId}`);

        const notificationMessage = `New system message in your trip: "${text.substring(0, 50)}..."`;
        const promises = trip.members.map(memberId => createAndDispatchNotification({
            user: memberId,
            message: notificationMessage,
            type: 'group',
            tripId: tripId,
            link: `/trips/${tripId}/chat`
        }));

        await Promise.all(promises);

    } catch (error) {
        logger.error('Failed to create and send system message', { error: error.message, tripId });
    }
};


module.exports = {
  initNotificationService,
  createAndDispatchNotification, // Export the core function for direct use if needed
  sendTripSuccess,
  sendTripError,
  sendItineraryUpdate,
  sendSystemMessageToTrip,
};