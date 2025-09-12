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
 * Reusable helper to fetch a trip and verify user's permission level.
 * @param {string} tripId - The ID of the trip to fetch.
 * @param {string} userId - The ID of the user performing the action.
 * @param {string[]} requiredRoles - Array of roles that are allowed to perform the action.
 * @returns {Promise<{trip: object, member: object}>} - The trip document and the member object.
 */
async function getTripAndVerifyPermission(tripId, userId, requiredRoles = ['viewer', 'editor', 'owner']) {
    // Populating user details for better frontend display
    const trip = await Trip.findById(tripId).populate(
        'group.members.userId',
        'name email profileImage'
    );
    if (!trip) {
        throw new AppError('Trip not found.', 404);
    }

    const member = trip.group.members.find(m => m.userId._id.toString() === userId.toString());
    if (!member) {
        throw new AppError('Access denied. You are not a member of this trip.', 403);
    }

    if (!requiredRoles.includes(member.role)) {
        throw new AppError(`Permission denied. Required role: ${requiredRoles.join(' or ')}.`, 403);
    }

    return { trip, member };
}


/**
 * @desc    Get all trips for the current user with filtering and pagination.
 * @route   GET /api/trips
 * @access  Private
 */
exports.getAllTrips = async (req, res, next) => {
    const { page = 1, limit = 10, status, destination } = req.query;
    const userId = req.user._id;
    const queryKey = cacheKeys.generateUserTripsKey(userId, req.query);

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
            // Using a case-insensitive regex for better search results
            query['destination.name'] = { $regex: destination, $options: 'i' };
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

        await setCache(queryKey, responseData, 300); // Cache for 5 minutes
        logger.info(`Fetched and cached ${trips.length} trips for ${req.user.email}`);
        return sendSuccess(res, 200, 'Trips fetched successfully.', responseData);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get a single trip by its ID.
 * @route   GET /api/trips/:id
 * @access  Private (Trip Members)
 */
exports.getTripById = async (req, res, next) => {
    try {
        const { trip } = await getTripAndVerifyPermission(req.params.id, req.user._id);
        return sendSuccess(res, 200, 'Trip fetched successfully.', { trip });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update core trip details.
 * @route   PATCH /api/trips/:id/details
 * @access  Private (Owner or Editor)
 */
exports.updateTripDetails = async (req, res, next) => {
    try {
        const { trip } = await getTripAndVerifyPermission(req.params.id, req.user._id, ['owner', 'editor']);
        
        // Sanitize and apply updates
        Object.assign(trip, req.body);
        const updatedTrip = await trip.save();
        
        await invalidateTripCache(trip._id);
        await Promise.all(trip.group.members.map(m => invalidateUserCache(m.userId._id)));

        logger.info(`Trip details updated for: ${updatedTrip._id}`);
        return sendSuccess(res, 200, 'Trip updated successfully', { trip: updatedTrip });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete a trip and its associated data.
 * @route   DELETE /api/trips/:id
 * @access  Private (Owner only)
 */
exports.deleteTrip = async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const { trip } = await getTripAndVerifyPermission(req.params.id, req.user._id, ['owner']);
            const memberIds = trip.group.members.map(m => m.userId);

            await Trip.findByIdAndDelete(req.params.id, { session });
            await ChatSession.deleteOne({ tripId: req.params.id }, { session });
            
            await Promise.all(memberIds.map(userId => invalidateUserCache(userId)));
            
            logger.info(`Trip deleted: ${trip._id}`);
            return sendSuccess(res, 200, 'Trip deleted successfully');
        });
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Remove a member from a trip.
 * @route   DELETE /api/trips/:tripId/members/:memberId
 * @access  Private (Owner only)
 */
exports.removeMemberFromTrip = async (req, res, next) => {
    const { tripId, memberId } = req.params;
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const { trip } = await getTripAndVerifyPermission(tripId, req.user._id, ['owner']);
            if (req.user._id.toString() === memberId) {
                throw new AppError('The owner cannot be removed from the trip.', 400);
            }

            trip.group.members = trip.group.members.filter(m => m.userId._id.toString() !== memberId);
            await trip.save({ session });
            await ChatSession.updateOne({ tripId }, { $pull: { participants: memberId } }, { session });

            await invalidateTripCache(tripId);
            await invalidateUserCache(memberId);
            await Promise.all(trip.group.members.map(m => invalidateUserCache(m.userId._id))); 

            logger.info(`Member ${memberId} removed from trip ${tripId}`);
            return sendSuccess(res, 200, 'Member removed successfully.', { members: trip.group.members });
        });
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Update the role of a trip member.
 * @route   PATCH /api/trips/:tripId/members/:memberId/role
 * @access  Private (Owner only)
 */
exports.updateMemberRole = async (req, res, next) => {
    const { tripId, memberId } = req.params;
    const { role } = req.body;

    try {
        const { trip } = await getTripAndVerifyPermission(tripId, req.user._id, ['owner']);
        const memberToUpdate = trip.group.members.find(m => m.userId._id.toString() === memberId);
        
        if (!memberToUpdate) {
            throw new AppError('Member not found in this trip.', 404);
        }
        if (memberToUpdate.userId._id.toString() === req.user._id.toString()) {
            throw new AppError('The owner cannot change their own role.', 400);
        }

        memberToUpdate.role = role;
        await trip.save();

        await invalidateTripCache(trip._id);
        await Promise.all(trip.group.members.map(m => invalidateUserCache(m.userId._id)));

        logger.info(`Role for member ${memberId} in trip ${tripId} changed to ${role}`);
        return sendSuccess(res, 200, 'Member role updated successfully.', { members: trip.group.members });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Download trip itinerary as a PDF.
 * @route   GET /api/trips/:id/download
 * @access  Private (Trip Members)
 */
exports.downloadTripPdf = async (req, res, next) => {
    try {
        const { trip } = await getTripAndVerifyPermission(req.params.id, req.user._id);
        logger.info(`Generating PDF for trip: ${trip._id}`);
        const pdfBuffer = await pdfService.generateTripPdf(trip);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="WayMate-Itinerary-${trip.name.replace(/\s+/g, '-')}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        logger.error(`Failed to generate PDF for trip ${req.params.id}: ${error.message}`);
        next(error);
    }
};

/**
 * @desc    Toggle the favorite status of a trip.
 * @route   PATCH /api/trips/:id/favorite
 * @access  Private (Trip Members)
 */
exports.toggleFavoriteStatus = async (req, res, next) => {
    try {
        const { trip } = await getTripAndVerifyPermission(req.params.id, req.user._id);
        trip.favorite = !trip.favorite;
        await trip.save();
        
        await invalidateUserCache(req.user._id); // Invalidate user-specific caches

        logger.info(`Trip ${trip._id} favorite status set to ${trip.favorite}`);
        return sendSuccess(res, 200, 'Favorite status updated successfully.', { favorite: trip.favorite });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update the status of a specific trip.
 * @route   PATCH /api/trips/:id/status
 * @access  Private (Owner or Editor)
 */
exports.updateTripStatus = async (req, res, next) => {
    const { status } = req.body;
    const { id } = req.params;

    try {
        const { trip } = await getTripAndVerifyPermission(id, req.user._id, ['owner', 'editor']);

        trip.status = status;
        await trip.save();
        
        await invalidateTripCache(trip._id);
        await Promise.all(trip.group.members.map(m => invalidateUserCache(m.userId._id)));

        notificationService.broadcastToTrip(
            trip._id.toString(), 
            'tripStatusUpdated',
            {
                tripId: trip._id,
                status: trip.status,
                message: `The status of your trip to ${trip.name} was updated to "${trip.status}".`
            }
        );

        logger.info(`Trip ${trip._id} status updated to ${status} by user ${req.user._id}`);
        return sendSuccess(res, 200, 'Trip status updated successfully.', { trip });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Generate a short-lived invitation token for a trip.
 * @route   POST /api/trips/:id/generate-invite
 * @access  Private (Owner or Editor)
 */
exports.generateInviteLink = async (req, res, next) => {
    try {
        const { trip } = await getTripAndVerifyPermission(req.params.id, req.user._id, ['owner', 'editor']);
        const inviteToken = crypto.randomBytes(20).toString('hex');
        const inviteTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        trip.inviteTokens.push({ token: inviteToken, expires: inviteTokenExpires });
        await trip.save();

        // FIX: Return just the token instead of a web link
        logger.info(`Invite token generated for trip ${trip._id} by ${req.user.email}`);
        return sendSuccess(res, 200, 'Invite token generated successfully', { 
            inviteToken: inviteToken,
            expiresAt: new Date(inviteTokenExpires).toISOString(),
            tripName: trip.destination || trip.name
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Accept an invitation to join a trip using a token.
 * @route   POST /api/trips/accept-invite
 * @access  Private
 */
exports.acceptTripInvite = async (req, res, next) => {
    const { token, ageGroup, gender, relation } = req.body;
    const userId = req.user._id;
    const session = await mongoose.startSession();

    try {
        let joinedTrip;
        await session.withTransaction(async () => {
            const trip = await Trip.findOne({
                'inviteTokens.token': token,
                'inviteTokens.expires': { $gt: Date.now() }
            }).session(session);

            if (!trip) {
                throw new AppError('Invalid or expired invite link.', 400);
            }
            if (trip.group.members.some(m => m.userId.toString() === userId.toString())) {
                throw new AppError('You are already a member of this trip.', 400);
            }

            trip.group.members.push({ userId, role: 'editor', ageGroup, gender, relation });
            trip.group.isGroup = true;
            trip.inviteTokens = trip.inviteTokens.filter(t => t.token !== token);
            await trip.save({ session });

            await ChatSession.updateOne({ tripId: trip._id }, { $addToSet: { participants: userId } }, { session });
            joinedTrip = trip;
        });

        // --- Side-effects after successful transaction ---
        logger.info(`User ${req.user.email} joined trip ${joinedTrip._id} via invite link.`);

        await invalidateTripCache(joinedTrip._id);
        const memberIds = joinedTrip.group.members.map(m => m.userId);
        await Promise.all(memberIds.map(id => invalidateUserCache(id)));
        
        notificationService.broadcastToTrip(
            joinedTrip._id.toString(),
            'memberJoined',
            { 
                message: `${req.user.name} has joined the trip!`,
                tripId: joinedTrip._id,
            },
            userId.toString() // Exclude the user who just joined
        );

        return sendSuccess(res, 200, 'Successfully joined the trip!', { tripId: joinedTrip._id });

    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Upgrades a trip with a detailed, AI-powered train schedule.
 * @route   POST /api/trips/:id/smart-schedule
 * @access  Private (Trip Members)
 */
exports.upgradeToSmartSchedule = async (req, res, next) => {
    try {
        const { trip } = await getTripAndVerifyPermission(req.params.id, req.user._id);
        
        // Ensure necessary data exists
        if (!trip.origin || !trip.destinationCoordinates || !trip.startDate) {
            throw new AppError('Trip is missing origin, destination, or start date for smart schedule.', 400);
        }

        const schedule = await smartSeatScheduleService.getSmartSeatSchedule(
            trip.origin.coords,
            trip.destinationCoordinates,
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
        next(error);
    }
};

/**
 * @desc    Update the activities for a specific day in a trip's itinerary.
 * @route   PATCH /api/trips/:id/itinerary/:day
 * @access  Private (Owner or Editor)
 */
exports.updateDayItinerary = async (req, res, next) => {
    const { id, day } = req.params;
    const { activities } = req.body;

    try {
        const { trip } = await getTripAndVerifyPermission(id, req.user._id, ['owner', 'editor']);
        const dayToUpdate = trip.itinerary.find(d => d.day == day);

        if (!dayToUpdate) {
            throw new AppError(`Itinerary for day ${day} not found on this trip.`, 404);
        }

        dayToUpdate.activities = activities;
        await trip.save();
        await invalidateTripCache(trip._id);
        
        notificationService.broadcastToTrip(trip._id.toString(), 'itineraryUpdated', {
            tripId: trip._id,
            itinerary: trip.itinerary
        });

        logger.info(`Itinerary for day ${day} of trip ${trip._id} updated by ${req.user.email}`);
        return sendSuccess(res, 200, 'Itinerary updated successfully.', { day: dayToUpdate });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update the current user's demographic details for a specific trip.
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
 * @desc    Sync a batch of offline-created/updated trips.
 * @route   POST /api/trips/sync
 * @access  Private
 */
exports.syncOfflineTrips = async (req, res, next) => {
    const { trips } = req.body;
    try {
        const idMap = await tripService.processTripSync(req.user, trips);
        sendSuccess(res, 200, 'Trips synced successfully.', { idMap });
    } catch (error) {
        next(error);
    }
};
