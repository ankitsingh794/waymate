// routes/surveyRoutes.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const surveyController = require('../controllers/surveyController');

// All routes in this file are protected and require user authentication.
router.use(protect);

// Reusable validation chain for survey data.
const surveyValidationRules = [
    body('householdIncome')
        .optional()
        .isIn(['<25k', '25k-50k', '50k-100k', '100k-200k', '>200k', 'prefer_not_to_say']),
    body('vehicleCount')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Vehicle count must be a non-negative integer.'),
    body('primaryTransportModeToWork')
        .optional()
        .isIn(['private_car', 'private_bike', 'public_transport', 'walk_cycle', 'work_from_home', 'other'])
];

/**
 * @route   GET /api/v1/surveys/my-data
 * @desc    Get the current user's survey data
 * @access  Private
 */
router.get('/my-data', surveyController.getMySurveyData);

/**
 * @route   POST /api/v1/surveys/my-data
 * @desc    Create or update the current user's survey data
 * @access  Private
 */
router.post('/my-data', surveyValidationRules, validate, surveyController.submitOrUpdateSurveyData);

module.exports = router;