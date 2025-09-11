
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const Trip = require('../models/Trip');
const logger = require('../utils/logger');
const sendEmail = require('../utils/sendEmail');
const { generateTripReadyEmailHTML } = require('../utils/emailTemplates');

let io = null;


function initNotificationService(socketIoInstance) {
    io = socketIoInstance;
    logger.info('✅ Notification service initialized.');
}

function emitToUser(userId, event, payload) {
    if (!io) return logger.warn(`Socket.IO not initialized. Cannot emit '${event}'.`);
    io.to(userId.toString()).emit(event, payload);
    logger.info(`Socket event '${event}' emitted to user ${userId}`);
}

function broadcastToTrip(tripId, event, payload) {
    if (!io) return logger.warn(`Socket.IO not initialized. Cannot broadcast '${event}'.`);
    io.to(tripId.toString()).emit(event, payload);
    logger.info(`Socket event '${event}' broadcast to trip ${tripId}`);
}

async function createAndDispatchNotification(notificationData) {
    if (!notificationData.user || !notificationData.message) {
        logger.error('Notification failed: Missing user or message.', { data: notificationData });
        return null;
    }
    try {
        const notification = await Notification.create(notificationData);
        logger.info(`Notification created in DB for user ${notificationData.user}`);
        emitToUser(notification.user, 'newNotification', notification);
        return notification;
    } catch (error) {
        logger.error('Failed to create and dispatch notification', { 
            error: error.message, 
            userId: notificationData.user 
        });
        return null;
    }
}

async function sendStatusUpdate(userId, message) {
    emitToUser(userId, 'statusUpdate', { status: message });
}

async function sendTripSuccess(user, tripSummary) {
    const message = `Your trip to ${tripSummary.destinationName} is ready!`;
    await createAndDispatchNotification({
        user: user._id, message: message, type: 'trip', tripId: tripSummary._id, link: `/trips/${tripSummary._id}`
    });
    try {
        const html = generateTripReadyEmailHTML(user.name, tripSummary);
        await sendEmail({
            to: user.email, subject: `Your Itinerary for ${tripSummary.destinationName} is Here!`, html: html,
        });
        logger.info(`Trip ready confirmation email sent to ${user.email}`);
    } catch (error) {
        logger.error('Failed to send trip ready email', { error: error.message, userId: user._id });
    }
}

async function sendTripError(userId, customMessage) {
    await createAndDispatchNotification({
        user: userId, message: customMessage, type: 'alert', priority: 'high'
    });
}

async function sendItineraryUpdate(tripId, updatedByUserId) {
    try {
        const trip = await Trip.findById(tripId).select('members').lean();
        if (!trip) return logger.warn(`Trip not found for itinerary update notification: ${tripId}`);
        const message = "The trip itinerary has been updated.";
        const promises = trip.members
            .filter(memberId => memberId.toString() !== updatedByUserId.toString())
            .map(memberId => createAndDispatchNotification({
                user: memberId, message: message, type: 'trip', tripId: tripId, link: `/trips/${tripId}`
            }));
        await Promise.all(promises);
        broadcastToTrip(tripId, 'itineraryUpdated', { tripId });
    } catch (error) {
        logger.error('Failed to send itinerary update notifications', { error: error.message, tripId });
    }
}

async function sendSystemMessageToTrip(tripId, text) {
    try {
        const message = await Message.create({ chatSession: tripId, type: 'system', text: text });
        broadcastToTrip(tripId, 'newMessage', message);
        const trip = await Trip.findById(tripId).select('members').lean();
        if (!trip) return logger.warn(`Trip not found for system message notification: ${tripId}`);
        const notificationMessage = `New system message in your trip: "${text.substring(0, 50)}..."`;
        const promises = trip.members.map(memberId => createAndDispatchNotification({
            user: memberId, message: notificationMessage, type: 'group', tripId: tripId, link: `/trips/${tripId}/chat`
        }));
        await Promise.all(promises);
    } catch (error) {
        logger.error('Failed to create and send system message', { error: error.message, tripId });
    }
}

module.exports = {
  initNotificationService,
  createAndDispatchNotification,
  sendTripSuccess,
  sendTripError,
  sendItineraryUpdate,
  sendSystemMessageToTrip,
  sendStatusUpdate,
  emitToUser,
  broadcastToTrip,
};