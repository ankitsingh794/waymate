const Group = require('../models/Group');
const ChatSession = require('../models/ChatSession');
const Message = require('../models/Message');
const User = require('../models/User');
const Trip = require('../models/Trips');
const { sendResponse } = require('../utils/responseHelper');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * @desc    Create a new group for a trip
 * @route   POST /api/groups/trip/:tripId
 * @access  Private
 */
exports.createGroup = async (req, res) => {
    const { name, description } = req.body;
    const { tripId } = req.params;
    const userId = req.user._id; // Assuming authenticate middleware adds user to req

    if (!name) {
        return sendResponse(res, 400, false, 'Group name is required.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Verify the trip exists and the user is part of it
        const trip = await Trip.findById(tripId).session(session);
        if (!trip) {
            await session.abortTransaction();
            return sendResponse(res, 404, false, 'Trip not found.');
        }
        // Add logic here to verify user is a member of the trip if applicable

        // 2. Create the associated Chat Session
        const chatSession = new ChatSession({
            participants: [userId],
            sessionType: 'group',
            tripId: tripId,
            lastMessage: { text: 'Group created!' }
        });
        await chatSession.save({ session });

        // 3. Create the Group
        const group = new Group({
            name,
            description,
            tripId,
            createdBy: userId,
            members: [{ user: userId, role: 'admin' }], // Creator is the first admin
            chatSessionId: chatSession._id, // Link to the chat session
        });
        await group.save({ session });
        
        // 4. Link the group ID back to the chat session
        chatSession.groupId = group._id;
        await chatSession.save({ session });

        await session.commitTransaction();

        logger.info(`Group "${name}" created successfully for trip ${tripId} by user ${userId}`);
        sendResponse(res, 201, true, 'Group created successfully', { 
            group: group ,
            chatSessionId: group.chatSessionId
        });

    } catch (error) {
        await session.abortTransaction();
        logger.error(`Error creating group: ${error.message}`);
        sendResponse(res, 500, false, 'Failed to create group.');
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Get details of a specific group
 * @route   GET /api/groups/:groupId
 * @access  Private (for members)
 */
exports.getGroupDetails = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId)
            .populate('members.user', 'username email profile.avatar') // Populate user details
            .populate('createdBy', 'username email');

        if (!group) {
            return sendResponse(res, 404, false, 'Group not found.');
        }

        // Check if the requesting user is a member of the group
        const isMember = group.members.some(member => member.user._id.equals(req.user._id));
        if (!isMember) {
            return sendResponse(res, 403, false, 'Access denied. You are not a member of this group.');
        }

        sendResponse(res, 200, true, 'Group details fetched successfully', { group });

    } catch (error) {
        logger.error(`Error fetching group details: ${error.message}`);
        sendResponse(res, 500, false, 'Failed to fetch group details.');
    }
};

/**
 * @desc    Add a member to a group
 * @route   POST /api/groups/:groupId/members
 * @access  Private (Admin only)
 */
exports.addMember = async (req, res) => {
    const { email } = req.body;
    const { groupId } = req.params;
    const requesterId = req.user._id;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return sendResponse(res, 404, false, 'Group not found.');
        }

        // 1. Check if the requester is an admin
        const admin = group.members.find(member => member.user.equals(requesterId) && member.role === 'admin');
        if (!admin) {
            return sendResponse(res, 403, false, 'Only admins can add members.');
        }

        // 2. Find the user to be added by email
        const userToAdd = await User.findOne({ email });
        if (!userToAdd) {
            return sendResponse(res, 404, false, `User with email ${email} not found.`);
        }

        // 3. Check if the user is already a member
        const isAlreadyMember = group.members.some(member => member.user.equals(userToAdd._id));
        if (isAlreadyMember) {
            return sendResponse(res, 400, false, 'User is already a member of this group.');
        }

        // 4. Add the user to the group and the associated chat session
        group.members.push({ user: userToAdd._id, role: 'member' });
        
        await ChatSession.updateOne(
            { _id: group.chatSessionId },
            { $addToSet: { participants: userToAdd._id } } // $addToSet prevents duplicates
        );
        
        await group.save();

        logger.info(`User ${userToAdd._id} added to group ${groupId} by admin ${requesterId}`);
        sendResponse(res, 200, true, 'Member added successfully.', { members: group.members });

    } catch (error) {
        logger.error(`Error adding member to group: ${error.message}`);
        sendResponse(res, 500, false, 'Failed to add member.');
    }
};

/**
 * @desc    Remove a member from a group
 * @route   DELETE /api/groups/:groupId/members/:userIdToRemove
 * @access  Private (Admin only)
 */
exports.removeMember = async (req, res) => {
    const { groupId, userIdToRemove } = req.params;
    const requesterId = req.user._id;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return sendResponse(res, 404, false, 'Group not found.');
        }

        // 1. Check if the requester is an admin
        const admin = group.members.find(member => member.user.equals(requesterId) && member.role === 'admin');
        if (!admin) {
            return sendResponse(res, 403, false, 'Only admins can remove members.');
        }
        
        // 2. Prevent an admin from removing themselves if they are the last admin
        const memberToRemove = group.members.find(m => m.user.equals(userIdToRemove));
        if (!memberToRemove) {
            return sendResponse(res, 404, false, 'Member not found in the group.');
        }

        const adminCount = group.members.filter(m => m.role === 'admin').length;
        if (memberToRemove.role === 'admin' && adminCount <= 1) {
            return sendResponse(res, 400, false, 'Cannot remove the last admin from the group.');
        }

        // 3. Remove the member from the group and the chat session
        group.members = group.members.filter(member => !member.user.equals(userIdToRemove));
        
        await ChatSession.updateOne(
            { _id: group.chatSessionId },
            { $pull: { participants: userIdToRemove } }
        );

        await group.save();
        
        logger.info(`User ${userIdToRemove} removed from group ${groupId} by admin ${requesterId}`);
        sendResponse(res, 200, true, 'Member removed successfully.', { members: group.members });

    } catch (error) {
        logger.error(`Error removing member from group: ${error.message}`);
        sendResponse(res, 500, false, 'Failed to remove member.');
    }
};
