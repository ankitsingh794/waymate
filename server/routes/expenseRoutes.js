const express = require('express');
const { body, param } = require('express-validator');
const { protect } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const {
    addExpense,
    getTripExpenses,
    updateExpense,
    deleteExpense
} = require('../controllers/expenseController');
const { mongoIdValidation } = require('../utils/validationHelpers');


// Using mergeParams: true allows us to access :tripId from the parent router (tripRoutes.js)
const router = express.Router({ mergeParams: true });

// All expense routes require an authenticated user.
router.use(protect);

// --- Validation Chains ---


const addExpenseValidation = [
    body('description').notEmpty().withMessage('Description is required.'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number.'),
    body('paidBy').isMongoId().withMessage('A valid user ID for who paid is required.'),
    body('participants').isArray({ min: 1 }).withMessage('At least one participant is required.'),
    body('participants.*.userId').isMongoId().withMessage('Invalid user ID in participants.'),
    body('participants.*.share').isFloat({ gte: 0 }).withMessage('Share must be a non-negative number.'),
];

const updateExpenseValidation = [
    body('description').optional().notEmpty().withMessage('Description cannot be empty.'),
    body('amount').optional().isFloat({ gt: 0 }).withMessage('Amount must be a positive number.'),
    body('category').optional().isIn(['Food', 'Transport', 'Accommodation', 'Activities', 'Shopping', 'Other']),
    body('participants').optional().isArray({ min: 1 }).withMessage('At least one participant is required.')
];


// --- Routes ---

/**
 * @route   POST /api/trips/:tripId/expenses
 * @desc    Add a new expense to a trip
 */
router.post('/', addExpenseValidation, validate, addExpense);

/**
 * @route   GET /api/trips/:tripId/expenses
 * @desc    Get all expenses and the settlement summary for a trip
 */
router.get('/', getTripExpenses);

/**
 * @route   PUT /api/trips/:tripId/expenses/:expenseId
 * @desc    Update an existing expense
 */
router.put('/:expenseId', mongoIdValidation('expenseId'), updateExpenseValidation, validate, updateExpense);

/**
 * @route   DELETE /api/trips/:tripId/expenses/:expenseId
 * @desc    Delete an expense
 */
router.delete('/:expenseId', mongoIdValidation('expenseId'), validate, deleteExpense);


module.exports = router;