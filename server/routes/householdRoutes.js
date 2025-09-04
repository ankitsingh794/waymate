const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, isHouseholdHead } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { mongoIdValidation } = require('../utils/validationHelpers');
const householdController = require('../controllers/householdController');

// All routes require an authenticated user
router.use(protect);

router.post('/', [body('householdName').notEmpty()], validate, householdController.createHousehold);
router.post('/accept-invite', [body('token').notEmpty()], validate, householdController.acceptHouseholdInvite);

router.post(
    '/generate-invite',
    isHouseholdHead, 
    householdController.generateInviteLink
);

router.route('/:id')
    .get(mongoIdValidation('id'), householdController.getMyHouseholdDetails)
    .patch([mongoIdValidation('id'), body('householdName').notEmpty()], validate, isHouseholdHead, householdController.createHousehold)
    .delete(mongoIdValidation('id'), validate, isHouseholdHead, householdController.deleteHousehold);

router.delete('/:id/members/:memberId', [mongoIdValidation('id'), mongoIdValidation('memberId')], validate, isHouseholdHead, householdController.removeMember);

module.exports = router;