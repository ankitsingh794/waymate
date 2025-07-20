
const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { protect } = require('../middlewares/authMiddleware');
const { isGroupMember, isGroupAdmin } = require('../middlewares/groupAuthMiddleware');
const { groupCreationLimiter } = require('../middlewares/rateLimiter');

// --- Group Management ---

// Create a new group for a specific trip
router.post('/trip/:tripId', protect, groupCreationLimiter, groupController.createGroup);

// Get details for a specific group
// isGroupMember ensures only members can view
router.get('/:groupId', protect, isGroupMember, groupController.getGroupDetails);

// --- Member Management (Admin Only) ---

// Add a new member to a group
// isGroupAdmin ensures only admins can perform this action
router.post('/:groupId/members', protect, isGroupMember, isGroupAdmin, groupController.addMember);

// Remove a member from a group
router.delete('/:groupId/members/:userIdToRemove', protect, isGroupMember, isGroupAdmin, groupController.removeMember);

module.exports = router;
