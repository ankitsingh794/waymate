/**
 * @file routes/householdRoutes.js
 * @description Express router for household-related endpoints.
 * Routes have been updated to be more RESTful and include new functionality.
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, isHouseholdHead } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { mongoIdValidation } = require('../utils/validationHelpers');
const householdController = require('../controllers/householdController');

// All routes below are protected
router.use(protect);

// Create a new household or accept an invite
router.post('/', [body('householdName').notEmpty().trim()], validate, householdController.createHousehold);
router.post('/accept-invite', [body('token').notEmpty().trim()], validate, householdController.acceptHouseholdInvite);

// Get details for the user's current household
router.get('/my-household', householdController.getMyHouseholdDetails);

// --- Routes requiring household ID and Head permissions ---
// Use a common middleware for routes that operate on a specific household
const householdHeadRouter = express.Router({ mergeParams: true });
householdHeadRouter.use(mongoIdValidation('id'), validate, isHouseholdHead);

// Attach the sub-router
router.use('/:id', householdHeadRouter);

// Manage household details and surveys
householdHeadRouter.patch('/', [body('householdName').notEmpty().trim()], validate, householdController.updateHousehold);
householdHeadRouter.delete('/', householdController.deleteHousehold);
householdHeadRouter.patch('/survey', householdController.submitSurvey);

// Manage invites
householdHeadRouter.post('/generate-invite', householdController.generateInviteLink);

// Manage members
householdHeadRouter.patch('/members/:memberId', [mongoIdValidation('memberId')], validate, householdController.updateMemberDetails);
householdHeadRouter.delete('/members/:memberId', [mongoIdValidation('memberId')], validate, householdController.removeMember);

// User leaving a household (doesn't require head permission, just membership)
router.post('/:id/leave', [mongoIdValidation('id')], validate, householdController.leaveHousehold);


module.exports = router;
