const mongoose = require('mongoose');
const crypto = require('crypto');
const Household = require('../models/Household');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

/**
 * @desc    Create a new household
 * @route   POST /api/v1/households
 * @access  Private
 */
exports.createHousehold = async (req, res, next) => {
    const { householdName } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await User.findById(req.user._id).session(session);
        if (user.householdId) {
            await session.abortTransaction();
            session.endSession();
            return next(new AppError('You are already a member of a household.', 400));
        }

        const [household] = await Household.create([{
            householdName,
            members: [{ userId: req.user._id, role: 'head' }]
        }], { session });

        user.householdId = household._id;
        await user.save({ session });

        await session.commitTransaction();
        logger.info(`New household '${householdName}' created by ${req.user.email}`);
        sendSuccess(res, 201, 'Household created successfully.', { household });
    } catch (error) {
        await session.abortTransaction();
        logger.error('Error creating household:', { error: error.message });
        return next(new AppError('Failed to create household.', 500));
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Get details of the current user's household
 * @route   GET /api/v1/households/my-household
 * @access  Private
 */
exports.getMyHouseholdDetails = async (req, res, next) => {
    try {
        if (!req.user.householdId) {
            return next(new AppError('You are not a member of any household.', 404));
        }
        const household = await Household.findById(req.user.householdId)
            .populate('members.userId', 'name email profileImage');

        if (!household) {
            // Data inconsistency; the user has an ID for a non-existent household.
            // This is a good place for a data sanitization routine in a real app.
            logger.warn(`User ${req.user.email} has an orphaned householdId: ${req.user.householdId}`);
            await User.findByIdAndUpdate(req.user._id, { $unset: { householdId: "" } });
            return next(new AppError('Could not find your household. Your profile has been updated.', 404));
        }

        sendSuccess(res, 200, 'Household details fetched successfully.', { household });
    } catch (error) {
        logger.error('Error fetching household details:', { error: error.message });
        return next(new AppError('Failed to fetch household details.', 500));
    }
};

/**
 * @desc    Generate an invite link for a household
 * @route   POST /api/v1/households/generate-invite
 * @access  Private (Household Head only)
 */
exports.generateInviteLink = async (req, res, next) => {
    try {
        // This controller relies on `isHouseholdHead` middleware to attach `req.household`
        const household = req.household;
        const inviteToken = crypto.randomBytes(20).toString('hex');
        const inviteTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        household.inviteTokens.push({
            token: inviteToken,
            expires: inviteTokenExpires,
            createdBy: req.user._id
        });
        await household.save();

        const inviteLink = `${process.env.CLIENT_URL}/join-household?token=${inviteToken}`;
        logger.info(`Invite link generated for household ${household._id} by ${req.user.email}`);
        sendSuccess(res, 200, 'Invite link generated.', { inviteLink });
    } catch (error) {
        logger.error('Error generating household invite link:', { error: error.message });
        return next(new AppError('Failed to generate invite link.', 500));
    }
};

/**
 * @desc    Accept a household invite
 * @route   POST /api/v1/households/accept-invite
 * @access  Private
 */
exports.acceptHouseholdInvite = async (req, res, next) => {
    const { token } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const household = await Household.findOne({
            'inviteTokens.token': token,
            'inviteTokens.expires': { $gt: Date.now() }
        }).session(session);

        if (!household) {
            await session.abortTransaction();
            session.endSession();
            return next(new AppError('Invalid or expired invite link.', 400));
        }

        const user = await User.findById(req.user._id).session(session);
        if (user.householdId) {
            await session.abortTransaction();
            session.endSession();
            return next(new AppError('You are already a member of a household.', 400));
        }

        household.members.push({ userId: req.user._id, role: 'member' });
        household.inviteTokens = household.inviteTokens.filter(t => t.token !== token);
        await household.save({ session });

        user.householdId = household._id;
        await user.save({ session });

        await session.commitTransaction();
        logger.info(`User ${req.user.email} joined household ${household._id}`);
        sendSuccess(res, 200, 'Successfully joined the household!', { householdId: household._id });
    } catch (error) {
        await session.abortTransaction();
        logger.error('Error accepting household invite:', { error: error.message });
        return next(new AppError('Failed to join household.', 500));
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Remove a member from a household
 * @route   DELETE /api/v1/households/members/:memberId
 * @access  Private (Household Head only)
 */
exports.removeMember = async (req, res, next) => {
    const { memberId } = req.params;
    const household = req.household; // From isHouseholdHead middleware

    if (memberId === req.user._id.toString()) {
        return next(new AppError('You cannot remove yourself as the head of the household.', 400));
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Ensure the member is actually in the household before attempting to remove
        const memberExists = household.members.some(m => m.userId.toString() === memberId);
        if (!memberExists) {
            await session.abortTransaction();
            session.endSession();
            return next(new AppError('This user is not a member of your household.', 404));
        }

        // Pull the member from the household array
        household.members.pull({ userId: memberId });
        await household.save({ session });

        // Remove the householdId from the user's document
        await User.findByIdAndUpdate(memberId, { $unset: { householdId: "" } }, { session });

        await session.commitTransaction();
        logger.info(`Member ${memberId} removed from household ${household._id} by ${req.user.email}`);
        sendSuccess(res, 200, 'Member removed successfully.');
    } catch (error) {
        await session.abortTransaction();
        logger.error(`Error removing member from household:`, { error: error.message });
        return next(new AppError('Failed to remove member.', 500));
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Leave a household
 * @route   POST /api/v1/households/leave
 * @access  Private
 */
exports.leaveHousehold = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        if (!req.user.householdId) {
            await session.abortTransaction();
            session.endSession();
            return next(new AppError('You are not in a household.', 400));
        }

        const household = await Household.findById(req.user.householdId).session(session);
        if (!household) {
            // Handle data inconsistency
            await User.findByIdAndUpdate(req.user._id, { $unset: { householdId: "" } }, { session });
            await session.commitTransaction();
            session.endSession();
            return next(new AppError('Household not found. Your profile has been corrected.', 404));
        }

        const member = household.members.find(m => m.userId.equals(req.user._id));
        if (member && member.role === 'head') {
            await session.abortTransaction();
            session.endSession();
            return next(new AppError('Household heads cannot leave. You must delete the household or transfer ownership.', 400));
        }

        // Pull the current user from the household's member list
        household.members.pull({ userId: req.user._id });
        await household.save({ session });

        // Remove the householdId from the user's own document
        req.user.householdId = undefined;
        await req.user.save({ session });

        await session.commitTransaction();
        logger.info(`User ${req.user.email} left household ${household._id}`);
        sendSuccess(res, 200, 'You have successfully left the household.');
    } catch (error) {
        await session.abortTransaction();
        logger.error('Error leaving household:', { error: error.message });
        return next(new AppError('Failed to leave household.', 500));
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Delete a household
 * @route   DELETE /api/v1/households
 * @access  Private (Household Head only)
 */
exports.deleteHousehold = async (req, res, next) => {
    const household = req.household; // From isHouseholdHead middleware
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const memberIds = household.members.map(m => m.userId);

        // Remove the householdId from all members' User documents
        await User.updateMany(
            { _id: { $in: memberIds } },
            { $unset: { householdId: "" } },
            { session }
        );

        // Delete the household document itself
        await Household.findByIdAndDelete(household._id, { session });

        await session.commitTransaction();
        logger.info(`Household ${household._id} was deleted by ${req.user.email}`);
        sendSuccess(res, 200, 'Household deleted successfully.');
    } catch (error) {
        await session.abortTransaction();
        logger.error(`Error deleting household:`, { error: error.message });
        return next(new AppError('Failed to delete household.', 500));
    } finally {
        session.endSession();
    }
};
