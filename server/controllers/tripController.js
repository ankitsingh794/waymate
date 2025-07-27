const mongoose = require('mongoose');
const crypto = require('crypto');
const pdfService = require('../services/pdfService');
const Trip = require('../models/Trip');
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const logger = require('../utils/logger');
const { sendResponse } = require('../utils/responseHelper');
const { getCache, setCache, invalidateCacheByPattern } = require('../config/redis');
const { getSocketIO } = require('../utils/socket');


/**
 * @desc    Get all trips for the current user (with Redis cache).
 * @route   GET /api/trips
 * @access  Private
 */

/**
 * Reusable helper to fetch a trip and verify user's permission level.
 * @param {string} tripId - The ID of the trip to fetch.
 * @param {string} userId - The ID of the user performing the action.
 * @param {string[]} requiredRoles - Array of roles that are allowed to perform the action.
 * @returns {Promise<{trip: object, member: object}>} - The trip document and the member object.
 */
async function getTripAndVerifyPermission(tripId, userId, requiredRoles = ['viewer', 'editor', 'owner']) {
    const trip = await Trip.findById(tripId).populate(
        'group.members.userId', 
        'name email profileImage' 
    );
    if (!trip) {
        throw { statusCode: 404, message: 'Trip not found.' };
    }

     const member = trip.group.members.find(m => m.userId._id.toString() === userId.toString());
    if (!member) {
        throw { statusCode: 403, message: 'Access denied. You are not a member of this trip.' };
    }

    if (!requiredRoles.includes(member.role)) {
        throw { statusCode: 403, message: `Permission denied. Required role: ${requiredRoles.join(' or ')}.` };
    }

    return { trip, member };
}

/**
 * Invalidates all cache entries for a user's trips.
 * @param {string} userId - The ID of the user whose cache should be cleared.
 */
async function invalidateAllTripCachesForUser(userId) {
    logger.debug(`Invalidating all trip caches for user ${userId}`);
    // This function should use Redis SCAN to find all keys matching the pattern
    // and delete them. This is a more robust approach than simple DEL.
    await invalidateCacheByPattern(`trips:${userId}:*`);
}


// --- CONTROLLER EXPORTS ---

/** *Gets all trips for the current user.
 * @desc    Get all trips for the current user.
 * @route   GET /api/trips
 * @access  Private
 */
exports.getAllTrips = async (req, res) => {
    const { page = 1, limit = 10, status, destination } = req.query;
    const userId = req.user._id;
    const queryKey = `trips:${userId}:page=${page}&limit=${limit}&status=${status || ''}&dest=${destination || ''}`;

    try {
        const cachedTrips = await getCache(queryKey);
        if (cachedTrips) {
            logger.info(`Returning cached trips for user ${userId} from key: ${queryKey}`);
            return sendResponse(res, 200, true, 'Trips fetched successfully from cache.', cachedTrips);
        }

        const query = { 'group.members.userId': userId };
        if (status) query.status = status;
        if (destination) query.$text = { $search: destination };

        const skip = (page - 1) * limit;
        const [trips, total] = await Promise.all([
            Trip.find(query).sort({ startDate: -1 }).skip(skip).limit(parseInt(limit)),
            Trip.countDocuments(query)
        ]);

        const responseData = {
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total,
            count: trips.length,
            data: trips
        };

        await setCache(queryKey, responseData, 300); // Cache for 5 minutes
        logger.info(`Fetched and cached ${trips.length} trips for ${req.user.email}`);
        return sendResponse(res, 200, true, 'Trips fetched successfully.', responseData);
    } catch (error) {
        logger.error(`Error fetching trips: ${error.message}`);
        return sendResponse(res, 500, false, 'Failed to fetch trips.');
    }
};

/** Gets a trip by ID.
 * @desc    Get a trip by ID.
 * @route   GET /api/trips/:id
 * @access  Private (Owner or Editor)
 * */

exports.getTripById = async (req, res) => {
    try {
        const { trip } = await getTripAndVerifyPermission(req.params.id, req.user._id);
        return sendResponse(res, 200, true, 'Trip fetched successfully.', { trip });
    } catch (error) {
        logger.error(`Error fetching trip by ID: ${error.message}`);
        return sendResponse(res, error.statusCode || 500, false, error.message || 'Failed to fetch trip.');
    }
};

/**
 * @desc    Update core trip details from the main edit page.
 * @route   PATCH /api/trips/:id/details
 * @access  Private (Owner or Editor)
 */
exports.updateTripDetails = async (req, res) => {
    try {
        const { trip } = await getTripAndVerifyPermission(req.params.id, req.user._id, ['owner', 'editor']);

        trip.startDate = req.body.startDate;
        trip.endDate = req.body.endDate;
        trip.travelers = req.body.travelers;
        trip.status = req.body.status;
        trip.preferences.accommodationType = req.body.preferences.accommodationType;

        await trip.save();

        await Promise.all(trip.group.members.map(m => invalidateAllTripCachesForUser(m.userId)));

        logger.info(`Trip details updated for: ${trip._id}`);
        return sendResponse(res, 200, true, 'Trip updated successfully', { trip });
    } catch (error) {
        logger.error(`Error updating trip details: ${error.message}`);
        return sendResponse(res, error.statusCode || 500, false, error.message || 'Failed to update trip.');
    }
};

/** *Deletes a trip.
 * @desc    Delete a trip.
 * @route   DELETE /api/trips/:id
 * @access  Private (Owner only)
 * */

exports.deleteTrip = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { trip } = await getTripAndVerifyPermission(req.params.id, req.user._id, ['owner']);
        const memberIds = trip.group.members.map(m => m.userId);

        await Trip.findByIdAndDelete(req.params.id, { session });
        await ChatSession.deleteOne({ tripId: req.params.id }, { session });

        await session.commitTransaction();

        // Invalidate cache for all former members
        await Promise.all(memberIds.map(userId => invalidateAllTripCachesForUser(userId)));

        logger.info(`Trip deleted: ${trip._id}`);
        return sendResponse(res, 200, true, 'Trip deleted successfully');
    } catch (error) {
        await session.abortTransaction();
        logger.error(`Error deleting trip: ${error.message}`);
        return sendResponse(res, error.statusCode || 500, false, error.message || 'Failed to delete trip.');
    } finally {
        session.endSession();
    }
};



/** * Removes a member from a trip.
 * @desc    Remove a member from a trip.
 * @route   DELETE /api/trips/:tripId/members/:memberId
 * @access  Private (Owner only)
 * */

exports.removeMemberFromTrip = async (req, res) => {
    const { tripId, memberId } = req.params;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { trip } = await getTripAndVerifyPermission(tripId, req.user._id, ['owner']);
        if (req.user._id.toString() === memberId) {
            return sendResponse(res, 400, false, 'The owner cannot be removed from the trip.');
        }

        trip.group.members = trip.group.members.filter(m => m.userId.toString() !== memberId);
        await trip.save({ session });
        await ChatSession.updateOne({ tripId }, { $pull: { participants: memberId } }, { session });

        await session.commitTransaction();

        await invalidateAllTripCachesForUser(memberId);

        logger.info(`Member ${memberId} removed from trip ${tripId}`);
        return sendResponse(res, 200, true, 'Member removed successfully.', { members: trip.group.members });
    } catch (error) {
        await session.abortTransaction();
        logger.error(`Error removing member from trip ${tripId}: ${error.message}`);
        return sendResponse(res, error.statusCode || 500, false, error.message || 'Failed to remove member.');
    } finally {
        session.endSession();
    }
};

/** * Updates the role of a trip member.
 * @desc    Update the role of a trip member.
 * @route   PATCH /api/trips/:tripId/members/:memberId/role
 * @access  Private (Owner only)
 */

exports.updateMemberRole = async (req, res) => {
    const { tripId, memberId } = req.params;
    const { role } = req.body;
    if (!['editor', 'viewer'].includes(role)) {
        return sendResponse(res, 400, false, 'Invalid role. Must be "editor" or "viewer".');
    }
    try {
        const { trip } = await getTripAndVerifyPermission(tripId, req.user._id, ['owner']);
        const memberToUpdate = trip.group.members.find(m => m.userId.toString() === memberId);
        if (!memberToUpdate) {
            return sendResponse(res, 404, false, 'Member not found in this trip.');
        }
        if (memberToUpdate.userId.toString() === req.user._id.toString()) {
            return sendResponse(res, 400, false, 'The owner cannot change their own role.');
        }

        memberToUpdate.role = role;
        await trip.save();

        await Promise.all(
            trip.group.members.map(m => invalidateAllTripCachesForUser(m.userId))
        );

        logger.info(`Role for member ${memberId} in trip ${tripId} changed to ${role}`);
        return sendResponse(res, 200, true, 'Member role updated successfully.', { members: trip.group.members });
    } catch (error) {
        logger.error(`Error updating member role in trip ${tripId}: ${error.message}`);
        return sendResponse(res, error.statusCode || 500, false, error.message || 'Failed to update role.');
    }
};

/** * Downloads the trip itinerary as a PDF.
 * @desc    Download trip itinerary as PDF.
 * @route   GET /api/trips/:id/download
 * @access  Private (Owner or Editor)
 */
exports.downloadTripPdf = async (req, res) => {
    try {
        // FIX: Correctly uses the helper to verify membership before proceeding.
        const { trip } = await getTripAndVerifyPermission(req.params.id, req.user._id);
        logger.info(`Generating PDF for trip: ${trip._id}`);
        const pdfBuffer = await pdfService.generateTripPdf(trip);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="WayMate-Itinerary-${trip.destination.replace(/\s+/g, '-')}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        logger.error(`Failed to generate PDF for trip ${req.params.id}: ${error.message}`);
        return sendResponse(res, error.statusCode || 500, false, error.message || 'Failed to generate PDF itinerary.');
    }
};

/**
 * Toggles the favorite status of a trip.
 * @desc    Toggle favorite status of a trip.
 * @route   PATCH /api/trips/:id/favorite
 * @access  Private (Owner or Editor)
 *  */

exports.toggleFavoriteStatus = async (req, res) => {
    try {
        const { trip } = await getTripAndVerifyPermission(req.params.id, req.user._id);
        trip.favorite = !trip.favorite;
        await trip.save();

        // Invalidate cache for all members to reflect the change.
        await Promise.all(trip.group.members.map(m => invalidateAllTripCachesForUser(m.userId)));

        logger.info(`Trip ${trip._id} favorite status set to ${trip.favorite}`);
        return sendResponse(res, 200, true, 'Favorite status updated successfully.', { favorite: trip.favorite });
    } catch (error) {
        logger.error(`Error toggling favorite status for trip ${req.params.id}: ${error.message}`);
        return sendResponse(res, error.statusCode || 500, false, error.message || 'Failed to update favorite status.');
    }
};


/**
 * @desc    Get all upcoming trips for the current user.
 * @route   GET /api/trips/upcoming
 * @access  Private
 */
exports.getUpcomingTrips = async (req, res) => {
    const userId = req.user._id;

    try {
        const upcomingTrips = await Trip.find({
            'group.members.userId': userId,
            startDate: { $gte: new Date() } // Find trips where the start date is today or later
        }).sort({ startDate: 1 }); // Sort by the soonest start date

        logger.info(`Fetched ${upcomingTrips.length} upcoming trips for user ${userId}`);
        return sendResponse(res, 200, true, 'Upcoming trips fetched successfully.', {
            count: upcomingTrips.length,
            data: upcomingTrips
        });

    } catch (error) {
        logger.error(`Error fetching upcoming trips for user ${userId}: ${error.message}`);
        return sendResponse(res, 500, false, 'Failed to fetch upcoming trips.');
    }
};

/**
 * @desc    Update the status of a specific trip.
 * @route   PATCH /api/trips/:id/status
 * @access  Private (Owner or Editor)
 */
exports.updateTripStatus = async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    const userId = req.user._id;

    try {
        // Use the helper to find the trip and verify the user has permission
        const { trip } = await getTripAndVerifyPermission(id, userId, ['owner', 'editor']);

        trip.status = status;
        await trip.save();

        // Invalidate cache for all members to reflect the status change
        await Promise.all(trip.group.members.map(m => invalidateAllTripCachesForUser(m.userId)));

        // Notify all trip members of the status change via WebSocket
        const io = getSocketIO();
        trip.group.members.forEach(member => {
            io.to(member.userId.toString()).emit('tripStatusUpdated', {
                tripId: trip._id,
                status: trip.status,
                message: `The status of your trip to ${trip.destination} was updated to "${trip.status}".`
            });
        });

        logger.info(`Trip ${trip._id} status updated to ${status} by user ${userId}`);
        return sendResponse(res, 200, true, 'Trip status updated successfully.', { trip });

    } catch (error) {
        logger.error(`Error updating trip status for trip ${id}: ${error.message}`);
        return sendResponse(res, error.statusCode || 500, false, error.message || 'Failed to update trip status.');
    }
};

exports.generateInviteLink = async (req, res) => {
    try {
        const { trip } = await getTripAndVerifyPermission(req.params.id, req.user._id, ['owner', 'editor']);

        const inviteToken = crypto.randomBytes(20).toString('hex');
        const inviteTokenExpires = Date.now() + 24 * 60 * 60 * 1000; 

        trip.inviteTokens.push({
            token: inviteToken,
            expires: inviteTokenExpires
        });
        await trip.save();

        const inviteLink = `${process.env.CLIENT_URL}/join-trip?token=${inviteToken}`;
        
        logger.info(`Invite link generated for trip ${trip._id} by ${req.user.email}`);
        return sendResponse(res, 200, true, 'Invite link generated successfully', { inviteLink });

    } catch (error) {
        logger.error(`Error generating invite link: ${error.message}`);
        return sendResponse(res, error.statusCode || 500, false, error.message || 'Failed to generate link.');
    }
};

exports.acceptTripInvite = async (req, res) => {
    const { token } = req.body;
    const userId = req.user._id;

    if (!token) {
        return sendResponse(res, 400, false, 'Invite token is required.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const trip = await Trip.findOne({
            'inviteTokens.token': token,
            'inviteTokens.expires': { $gt: Date.now() }
        });

        if (!trip) {
            return sendResponse(res, 400, false, 'Invalid or expired invite link.');
        }
        if (trip.group.members.some(m => m.userId.toString() === userId.toString())) {
            return sendResponse(res, 400, false, 'You are already a member of this trip.');
        }

        // Add the user to the trip and chat
        trip.group.members.push({ userId, role: 'editor' });
        trip.group.isGroup = true;
        // Optional: Remove the token after use to make it single-use
        trip.inviteTokens = trip.inviteTokens.filter(t => t.token !== token);
        await trip.save({ session });
        await ChatSession.updateOne({ tripId: trip._id }, { $addToSet: { participants: userId } }, { session });
        
        await session.commitTransaction();

        // Invalidate caches and notify the new member
        await invalidateAllTripCachesForUser(userId);
        
        const io = getSocketIO();
        io.to(userId.toString()).emit('newTripInvite', {
             message: `Welcome! You've successfully joined the trip to ${trip.destination}.`,
             tripId: trip._id,
        });

        logger.info(`User ${req.user.email} joined trip ${trip._id} via invite link.`);
        return sendResponse(res, 200, true, 'Successfully joined the trip!', { tripId: trip._id });
    } catch (error) {
        await session.abortTransaction();
        logger.error(`Error accepting trip invite: ${error.message}`);
        return sendResponse(res, 500, false, 'Failed to join trip.');
    } finally {
        session.endSession();
    }
};