const mongoose = require('mongoose');
const crypto = require('crypto');
const pdfService = require('../services/pdfService');
const Trip = require('../models/Trip');
const ChatSession = require('../models/ChatSession');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { getCache, setCache } = require('../config/redis');
const { getSocketIO } = require('../utils/socket');
const notificationService = require('../services/notificationService');
const cacheKeys = require('../utils/cacheKeys');
const { invalidateTripCache, invalidateUserCache } = require('../services/cacheInvalidationService');
const smartSeatScheduleService = require('../services/smartSeatScheduleService');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const tripService = require('../services/tripService');


/**
 * @desc    Upgrades a trip with a detailed, AI-powered train schedule.
 * @route   POST /api/trips/:id/smart-schedule
 * @access  Private (Trip Members)
 */
exports.upgradeToSmartSchedule = async (req, res) => {
    try {
        const { trip } = await getTripAndVerifyPermission(req.params.id, req.user._id);

        const schedule = await smartSeatScheduleService.getSmartSeatSchedule(
            trip.origin.coords,
            trip.destinationCoordinates, // Corrected to use destinationCoordinates
            new Date(trip.startDate).toISOString().split('T')[0]
        );

        if (schedule.error) {
            return sendError(res, 404, schedule.error);
        }

        trip.smartSchedule = schedule;
        await trip.save();

        await invalidateTripCache(trip._id);

        notificationService.broadcastToTrip(trip._id.toString(), 'scheduleUpdated', { tripId: trip._id, schedule });

        return sendSuccess(res, 200, 'Smart schedule generated successfully.', { schedule });
    } catch (error) {
        logger.error(`Failed to generate smart schedule for trip ${req.params.id}`, { message: error.message });
        return sendError(res, 500, 'Failed to generate smart schedule.');
    }
};

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
 * @desc    Update the activities for a specific day in a trip's itinerary.
 * @route   PATCH /api/trips/:id/itinerary/:day
 * @access  Private (Owner or Editor)
 */
exports.updateDayItinerary = async (req, res) => {
    const { id, day } = req.params;
    const { activities } = req.body;

    try {
        const { trip } = await getTripAndVerifyPermission(id, req.user._id, ['owner', 'editor']);

        const dayToUpdate = trip.itinerary.find(d => d.day == day);
        if (!dayToUpdate) {
            return sendError(res, 404, `Itinerary for day ${day} not found on this trip.`);
        }

        dayToUpdate.activities = activities;
        await trip.save();
        await invalidateTripCache(trip._id);
        await Promise.all(trip.group.members.map(m => invalidateUserCache(m.userId._id)));

        notificationService.broadcastToTrip(trip._id.toString(), 'itineraryUpdated', {
            tripId: trip._id,
            itinerary: trip.itinerary
        });

        logger.info(`Itinerary for day ${day} of trip ${trip._id} updated by ${req.user.email}`);
        return sendSuccess(res, 200, 'Itinerary updated successfully.', { day: dayToUpdate });

    } catch (error) {
        logger.error(`Error updating day itinerary for trip ${id}: ${error.message}`);
        return sendError(res, error.statusCode || 500, error.message || 'Failed to update itinerary.');
    }
};


/**
 * Gets all trips for the current user, with dynamic status filtering.
 * @desc    Get all trips for the current user.
 * @route   GET /api/trips
 * @access  Private
 */
exports.getAllTrips = async (req, res) => {
    const { page = 1, limit = 10, status, destination } = req.query;
    const userId = req.user._id;
    const queryKey = cacheKeys.generateUserTripsKey(req.user._id, req.query);

    try {
        const cachedTrips = await getCache(queryKey);
        if (cachedTrips) {
            logger.info(`Returning cached trips for user ${userId} from key: ${queryKey}`);
            return sendSuccess(res, 200, 'Trips fetched successfully from cache.', cachedTrips);
        }

        const now = new Date();
        const query = { 'group.members.userId': userId };
        let sort = { startDate: -1 }; 
        if (status) {
            switch (status) {
                case 'planned':
                    query.startDate = { $gte: now };
                    sort = { startDate: 1 }; 
                    break;
                case 'ongoing':
                    query.startDate = { $lte: now };
                    query.endDate = { $gte: now };
                    break;
                case 'completed':
                    query.endDate = { $lt: now };
                    break;
                case 'canceled':
                    query.status = 'canceled'; 
                    break;
            }
        }

        if (destination) {
            query.$text = { $search: destination };
        }

        const skip = (page - 1) * limit;
        const [trips, total] = await Promise.all([
            Trip.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
            Trip.countDocuments(query)
        ]);

        const responseData = {
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total,
            count: trips.length,
            data: trips
        };

        await setCache(queryKey, responseData, 300);
        logger.info(`Fetched and cached ${trips.length} trips for ${req.user.email}`);
        return sendSuccess(res, 200, 'Trips fetched successfully.', responseData);
    } catch (error) {
        logger.error(`Error fetching trips: ${error.message}`);
        return sendError(res, 500, 'Failed to fetch trips.');
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
        return sendSuccess(res, 200, 'Trip fetched successfully.', { trip });
    } catch (error) {
        logger.error(`Error fetching trip by ID: ${error.message}`);
        return sendError(res, error.statusCode || 500, error.message || 'Failed to fetch trip.');
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
        await invalidateTripCache(trip._id);
        await Promise.all(trip.group.members.map(m => invalidateUserCache(m.userId._id)));

        Object.assign(trip, req.body);
        const updatedTrip = await trip.save();

        logger.info(`Trip details updated for: ${updatedTrip._id}`);
        return sendSuccess(res, 200, 'Trip updated successfully', { trip: updatedTrip });
    } catch (error) {
        logger.error(`Error updating trip details: ${error.message}`);
        return sendError(res, error.statusCode || 500, error.message || 'Failed to update trip.');
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

        await Promise.all(memberIds.map(userId => invalidateUserCache(userId)));

        logger.info(`Trip deleted: ${trip._id}`);
        return sendSuccess(res, 200, 'Trip deleted successfully');
    } catch (error) {
        await session.abortTransaction();
        logger.error(`Error deleting trip: ${error.message}`);
        return sendError(res, error.statusCode || 500, error.message || 'Failed to delete trip.');
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
            return sendError(res, 400, 'The owner cannot be removed from the trip.');
        }

        trip.group.members = trip.group.members.filter(m => m.userId.toString() !== memberId);
        await trip.save({ session });
        await ChatSession.updateOne({ tripId }, { $pull: { participants: memberId } }, { session });

        await session.commitTransaction();

        await invalidateTripCache(tripId);
        await invalidateUserCache(memberId); // The removed member
        await Promise.all(trip.group.members.map(m => invalidateUserCache(m.userId))); 

        logger.info(`Member ${memberId} removed from trip ${tripId}`);
        return sendSuccess(res, 200, 'Member removed successfully.', { members: trip.group.members });
    } catch (error) {
        await session.abortTransaction();
        logger.error(`Error removing member from trip ${tripId}: ${error.message}`);
        return sendError(res, error.statusCode || 500, error.message || 'Failed to remove member.');
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
        return sendError(res, 400, 'Invalid role. Must be "editor" or "viewer".');
    }
    try {
        const { trip } = await getTripAndVerifyPermission(tripId, req.user._id, ['owner']);
        const memberToUpdate = trip.group.members.find(m => m.userId.toString() === memberId);
        if (!memberToUpdate) {
            return sendError(res, 404, 'Member not found in this trip.');
        }
        if (memberToUpdate.userId.toString() === req.user._id.toString()) {
            return sendError(res, 400, 'The owner cannot change their own role.');
        }

        memberToUpdate.role = role;
        await trip.save();

        await invalidateTripCache(trip._id);
        await Promise.all(
            trip.group.members.map(m => invalidateUserCache(m.userId))
        );

        logger.info(`Role for member ${memberId} in trip ${tripId} changed to ${role}`);
        return sendSuccess(res, 200, 'Member role updated successfully.', { members: trip.group.members });
    } catch (error) {
        logger.error(`Error updating member role in trip ${tripId}: ${error.message}`);
        return sendError(res, error.statusCode || 500, error.message || 'Failed to update role.');
    }
};

/** * Downloads the trip itinerary as a PDF.
 * @desc    Download trip itinerary as PDF.
 * @route   GET /api/trips/:id/download
 * @access  Private (Owner or Editor)
 */
exports.downloadTripPdf = async (req, res) => {
    try {
        const { trip } = await getTripAndVerifyPermission(req.params.id, req.user._id);
        logger.info(`Generating PDF for trip: ${trip._id}`);
        const pdfBuffer = await pdfService.generateTripPdf(trip);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="WayMate-Itinerary-${trip.destination.replace(/\s+/g, '-')}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        logger.error(`Failed to generate PDF for trip ${req.params.id}: ${error.message}`);
        return sendError(res, error.statusCode || 500, error.message || 'Failed to generate PDF itinerary.');
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
        await invalidateUserCache(req.user._id);

        logger.info(`Trip ${trip._id} favorite status set to ${trip.favorite}`);
        return sendSuccess(res, 200, 'Favorite status updated successfully.', { favorite: trip.favorite });
    } catch (error) {
        logger.error(`Error toggling favorite status for trip ${req.params.id}: ${error.message}`);
        return sendError(res, error.statusCode || 500, error.message || 'Failed to update favorite status.');
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
        const { trip } = await getTripAndVerifyPermission(id, userId, ['owner', 'editor']);

        trip.status = status;
        await trip.save();
        
        await invalidateTripCache(trip._id);
        await Promise.all(trip.group.members.map(m => invalidateUserCache(m.userId)));

        const io = getSocketIO();
        trip.group.members.forEach(member => {
            io.to(member.userId.toString()).emit('tripStatusUpdated', {
                tripId: trip._id,
                status: trip.status,
                message: `The status of your trip to ${trip.destination} was updated to "${trip.status}".`
            });
        });

        logger.info(`Trip ${trip._id} status updated to ${status} by user ${userId}`);
        return sendSuccess(res, 200, 'Trip status updated successfully.', { trip });

    } catch (error) {
        logger.error(`Error updating trip status for trip ${id}: ${error.message}`);
        return sendError(res, error.statusCode || 500, error.message || 'Failed to update trip status.');
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
        return sendSuccess(res, 200, 'Invite link generated successfully', { inviteLink });

    } catch (error) {
        logger.error(`Error generating invite link: ${error.message}`);
        return sendError(res, error.statusCode || 500, error.message || 'Failed to generate link.');
    }
};


exports.acceptTripInvite = async (req, res, next) => {
    const { token, ageGroup, gender, relation } = req.body;
    const userId = req.user._id;
    const session = await mongoose.startSession();

    let trip; // Define trip in a scope accessible after the transaction

    try {
        // --- Step 1: Perform all database writes within an atomic transaction ---
        await session.withTransaction(async () => {
            trip = await Trip.findOne({
                'inviteTokens.token': token,
                'inviteTokens.expires': { $gt: Date.now() }
            }).session(session);

            if (!trip) {
                // Use a custom error that can be caught outside
                throw new AppError('Invalid or expired invite link.', 400);
            }
            if (trip.group.members.some(m => m.userId.toString() === userId.toString())) {
                throw new AppError('You are already a member of this trip.', 400);
            }

            trip.group.members.push({ 
                userId, 
                role: 'editor',
                ageGroup,  // <-- Save the new field
                gender,    // <-- Save the new field
                relation   // <-- Save the new field
            });
            trip.group.isGroup = true;

            const user = await User.findById(userId).session(session);
            if (user.householdId && trip.householdId && !user.householdId.equals(trip.householdId)) {
                 // Optional: Business logic to prevent joining trips outside one's household
            }
            
            trip.group.members.push({ userId, role: 'editor' });
            trip.group.isGroup = true;
            trip.inviteTokens = trip.inviteTokens.filter(t => t.token !== token);
            await trip.save({ session });

            await ChatSession.updateOne({ tripId: trip._id }, { $addToSet: { participants: userId } }, { session });
        });

        // If the transaction failed, 'trip' will be undefined and an error will have been thrown.
        if (!trip) {
            // This case handles if findOne returned null inside the transaction
            return next(new AppError('Invalid or expired invite link.', 400));
        }

        // --- Step 2: Perform non-transactional side-effects AFTER the commit succeeds ---
        logger.info(`User ${req.user.email} joined trip ${trip._id} via invite link.`);

        // Invalidate caches for all relevant users
        const memberIds = trip.group.members.map(m => m.userId);
        await invalidateTripCache(trip._id);
        await Promise.all(memberIds.map(id => invalidateUserCache(id)));

        // Send real-time notification
        const io = getSocketIO();
        io.to(userId.toString()).emit('newTripInvite', {
            message: `Welcome! You've successfully joined the trip to ${trip.destination}.`,
            tripId: trip._id,
        });

        return sendSuccess(res, 200, 'Successfully joined the trip!', { tripId: trip._id });

    } catch (error) {
        next(error); // Pass to the global error handler
    } finally {
        // Always end the session.
        session.endSession();
    }
};



/**
 * @desc    Update the current user's demographic details for a specific trip
 * @route   PATCH /api/trips/:tripId/members/me
 * @access  Private (Trip Members with consent)
 */
exports.updateMyMemberDetails = async (req, res, next) => {
    const { tripId } = req.params;
    const { ageGroup, gender, relation } = req.body;

    try {
        const { trip, member } = await getTripAndVerifyPermission(tripId, req.user._id);

        if (ageGroup) member.ageGroup = ageGroup;
        if (gender) member.gender = gender;
        if (relation) member.relation = relation;

        await trip.save();
        await invalidateTripCache(trip._id);

        logger.info(`Demographic details for user ${req.user.email} updated on trip ${tripId}`);
        sendSuccess(res, 200, 'Your details for this trip have been updated.', { member });

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Sync a batch of offline-created/updated trips
 * @route   POST /api/trips/sync
 * @access  Private
 */
exports.syncOfflineTrips = async (req, res, next) => {
    const { trips } = req.body;
    const user = req.user;

    try {
        // The service will handle the complex logic and return the mapping
        const idMap = await tripService.processTripSync(user, trips);
        sendSuccess(res, 200, 'Trips synced successfully.', { idMap });
    } catch (error) {
        next(error);
    }
};