const Group = require('../models/Group');
const { sendResponse } = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Checks if the authenticated user is a member of the group specified in the request params.
 * Attaches the group and the user's membership info to the request object.
 */
const isGroupMember = async (req, res, next) => {
    try {
        const groupId = req.params.groupId || req.params.sessionId;
        if (!groupId) {
            return sendResponse(res, 400, false, 'Group or Session ID is missing.');
        }

        // Use 'let' so we can reassign the variable
        let group = await Group.findOne({ chatSessionId: groupId }).lean();

        // If the first attempt fails, try the fallback and assign to the SAME variable
        if (!group) {
            group = await Group.findById(groupId).lean();
        }
        
        // Now, check if group is still null after both attempts
        if (!group) {
            return sendResponse(res, 404, false, 'Group not found.');
        }
        
        // This line will now work correctly because 'group' is properly assigned
        const membership = group.members.find(member => member.user.equals(req.user._id));

        if (!membership) {
            return sendResponse(res, 403, false, 'Access Denied: You are not a member of this group.');
        }

        req.group = group;
        req.membership = membership;
        next();

    } catch (error) {
        logger.error(`Group membership check failed: ${error.message}`);
        return sendResponse(res, 500, false, 'Internal server error during permission check.');
    }
};

/**
 * Checks if the authenticated user is an admin of the group.
 * This middleware must run *after* isGroupMember.
 */
const isGroupAdmin = (req, res, next) => {
    // isGroupMember should have already run and attached the membership info
    if (!req.membership) {
        logger.error('isGroupAdmin was called without isGroupMember first.');
        return sendResponse(res, 500, false, 'Server configuration error.');
    }

    if (req.membership.role !== 'admin') {
        return sendResponse(res, 403, false, 'Access Denied: This action requires admin privileges.');
    }

    next();
};

module.exports = {
    isGroupMember,
    isGroupAdmin,
};
