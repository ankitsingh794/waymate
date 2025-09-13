
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
        
        // Enhanced notification dispatch with type-specific handling
        const enhancedPayload = {
            ...notification.toObject(),
            timestamp: new Date().toISOString(),
            priority: _getNotificationPriority(notificationData.type),
            requiresAction: _requiresUserAction(notificationData.type),
        };
        
        emitToUser(notification.user, 'newNotification', enhancedPayload);
        
        // Log notification metrics for analytics
        _logNotificationMetrics(notificationData.type, notification.user);
        
        return notification;
    } catch (error) {
        logger.error('Failed to create and dispatch notification', { 
            error: error.message, 
            userId: notificationData.user 
        });
        return null;
    }
}

// Enhanced trip confirmation notification
async function sendTripConfirmationRequest(userId, tripData) {
    const notificationData = {
        user: userId,
        type: 'tripConfirmationRequired',
        message: `We detected a trip by ${tripData.detectedMode}, but we're only ${Math.round(tripData.accuracy * 100)}% confident. Can you confirm the transportation mode?`,
        data: {
            tripId: tripData.tripId,
            detectedMode: tripData.detectedMode,
            accuracy: Math.round(tripData.accuracy * 100),
            needsConfirmation: true,
            priority: 'high',
            actions: [
                { id: `confirm_${tripData.detectedMode}`, label: `Confirm ${tripData.detectedMode}` },
                { id: 'choose_mode', label: 'Choose Different Mode' }
            ]
        },
        priority: 'high',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires in 24 hours
    };
    
    const notification = await createAndDispatchNotification(notificationData);
    
    // Also emit a specific trip confirmation event
    emitToUser(userId, 'tripConfirmationRequired', {
        tripId: tripData.tripId,
        detectedMode: tripData.detectedMode,
        accuracy: Math.round(tripData.accuracy * 100),
        message: notificationData.message,
        actions: notificationData.data.actions
    });
    
    return notification;
}

// Enhanced trip completion notification
async function sendTripCompletedNotification(userId, tripData) {
    const notificationData = {
        user: userId,
        type: 'tripCompleted',
        message: `Trip completed! Detected as ${tripData.mode} travel with ${Math.round(tripData.accuracy * 100)}% confidence.`,
        data: {
            tripId: tripData.tripId,
            mode: tripData.mode,
            accuracy: Math.round(tripData.accuracy * 100),
            autoConfirmed: true,
            priority: 'normal'
        },
        priority: 'normal'
    };
    
    const notification = await createAndDispatchNotification(notificationData);
    
    // Also emit a specific trip completed event
    emitToUser(userId, 'tripCompleted', {
        tripId: tripData.tripId,
        mode: tripData.mode,
        accuracy: Math.round(tripData.accuracy * 100),
        message: notificationData.message
    });
    
    return notification;
}

// Permission error notification
async function sendPermissionErrorNotification(userId, permissionType, message) {
    const notificationData = {
        user: userId,
        type: 'permissionError',
        message: message || `${permissionType} permission is required for trip tracking`,
        data: {
            permissionType,
            priority: 'high',
            actions: [
                { id: 'open_settings', label: 'Open Settings' },
                { id: 'dismiss', label: 'Dismiss' }
            ]
        },
        priority: 'high'
    };
    
    return await createAndDispatchNotification(notificationData);
}

// Helper function to determine notification priority
function _getNotificationPriority(type) {
    const priorityMap = {
        'tripConfirmationRequired': 'high',
        'permissionError': 'high',
        'tripCompleted': 'normal',
        'general': 'low'
    };
    return priorityMap[type] || 'normal';
}

// Helper function to determine if notification requires user action
function _requiresUserAction(type) {
    const actionRequiredTypes = ['tripConfirmationRequired', 'permissionError'];
    return actionRequiredTypes.includes(type);
}

// Helper function to log notification metrics
function _logNotificationMetrics(type, userId) {
    // This could be expanded to send to analytics service
    logger.info('Notification metric', {
        type,
        userId: userId.toString(),
        timestamp: new Date().toISOString(),
        source: 'enhanced_notification_service'
    });
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
  // Enhanced notification functions
  sendTripConfirmationRequest,
  sendTripCompletedNotification,
  sendPermissionErrorNotification,
};