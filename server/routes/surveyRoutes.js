const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const surveyController = require('../controllers/surveyController');

// All routes require an authenticated user.
router.use(protect);

// Validation chain for submitting survey data
const surveyValidation = [
    body('householdIncome').optional().isIn(['<25k', '25k-50k', '50k-100k', '100k-200k', '>200k', 'prefer_not_to_say']),
    body('vehicleCount').optional().isInt({ min: 0 }).withMessage('Vehicle count must be a non-negative number.'),
    body('primaryTransportModeToWork').optional().isIn(['private_car', 'private_bike', 'public_transport', 'walk_cycle', 'work_from_home', 'other'])
];

/**
 * @route   GET /api/v1/surveys/my-data
 * @desc    Get the current user's socio-economic survey data
 * @access  Private
 */
router.get('/my-data', surveyController.getMySurveyData);

/**
 * @route   POST /api/v1/surveys/my-data
 * @desc    Submit or update the current user's socio-economic survey data
 * @access  Private
 */
router.post('/my-data', surveyValidation, validate, surveyController.submitOrUpdateSurveyData);

module.exports = router;