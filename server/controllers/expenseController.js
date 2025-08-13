const Expense = require('../models/Expense');
const Trip = require('../models/Trip');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const logger = require('../utils/logger');
const notificationService = require('../services/notificationService');
const { getCache } = require('../config/redis');
const { calculateAndCacheSettlements, CACHE_KEY_PREFIX } = require('../services/expenseService');


/**
 * @desc    Add a new expense to a trip.
 * @route   POST /api/trips/:tripId/expenses
 * @access  Private (Group members only)
 */
exports.addExpense = async (req, res) => {
    const { tripId } = req.params;
    const { description, amount, category, paidBy, participants } = req.body;
    const userId = req.user._id;

    try {
        // 1. Verify the user is part of the trip.
        const trip = await Trip.findOne({ _id: tripId, 'group.members.userId': userId });
        if (!trip) {
            return sendError(res, 404, 'Trip not found or you are not a member.');
        }

        // 2. Validate the paidBy user exists in the trip's members.
        const memberIds = new Set(trip.group.members.map(m => m.userId.toString()));
        for (const p of participants) {
            if (!memberIds.has(p.userId.toString())) {
                return sendError(res, 400, `User with ID ${p.userId} is not a member of this trip.`);
            }
        }

        // 2. Validate the expense data.
        const totalShare = participants.reduce((sum, p) => sum + p.share, 0);
        if (Math.abs(totalShare - amount) > 0.01) { // Allow for small floating point discrepancies
            return sendError(res, 400, 'The sum of participant shares must equal the total expense amount.');
        }

        // 3. Create and save the new expense.
        const newExpense = await Expense.create({
            tripId,
            description,
            amount,
            category,
            paidBy,
            participants,
        });
        calculateAndCacheSettlements(req.params.tripId);

        const notificationPayload = {
            tripId,
            expense: newExpense,
            message: `${req.user.name} added a new expense: ${description}`
        };
        notificationService.broadcastToTrip(tripId, 'expenseAdded', notificationPayload);


        logger.info(`New expense added to trip ${tripId} by ${req.user.email}`);
        return sendSuccess(res, 201, true, 'Expense added successfully.', newExpense);

    } catch (error) {
        logger.error(`Error adding expense to trip ${tripId}: ${error.message}`);
        return sendSuccess(res, 500, 'Failed to add expense.');
    }
};

/**
 * @desc    Get all expenses and calculate the balance sheet for a trip.
 * @route   GET /api/trips/:tripId/expenses
 * @access  Private (Group members only)
 */
exports.getTripExpenses = async (req, res) => {
    const { tripId } = req.params;
    try {
        const trip = await Trip.findOne({ _id: tripId, 'group.members.userId': req.user._id });
        if (!trip) {
            return sendError(res, 404, 'Trip not found or you are not a member.');
        }

        const expenses = await Expense.find({ tripId }).populate('paidBy', 'name email');

        const cacheKey = `${CACHE_KEY_PREFIX}${tripId}`;
        let summary = await getCache(cacheKey);
        if (!summary) {
            summary = await calculateAndCacheSettlements(tripId);
        }

        return sendSuccess(res, 200, 'Expenses and balances fetched successfully.', {
            expenses,
            summary: summary || { totalSpent: 0, settlements: [], currency: trip.preferences?.currency || 'INR' }
        });

    } catch (error) {
        logger.error(`Error fetching expenses for trip ${tripId}: ${error.message}`);
        return sendError(res, 500, 'Failed to fetch expenses.');
    }
};


// Add these two new functions to your expenseController.js file

/**
 * @desc    Update an existing expense.
 * @route   PUT /api/trips/:tripId/expenses/:expenseId
 * @access  Private (Trip Owner/Editor or Payer)
 */
exports.updateExpense = async (req, res) => {
    const { tripId, expenseId } = req.params;
    const userId = req.user._id;

    try {
        // 1. Fetch the trip and the specific expense
        const trip = await Trip.findById(tripId);
        if (!trip) {
            return sendError(res, 404, 'Trip not found.');
        }

        const expense = await Expense.findById(expenseId);
        if (!expense || expense.tripId.toString() !== tripId) {
            return sendError(res, 404, 'Expense not found on this trip.');
        }

        // 2. Verify permissions
        const member = trip.group.members.find(m => m.userId.equals(userId));
        const isPayer = expense.paidBy.equals(userId);
        const canEdit = member && (member.role === 'owner' || member.role === 'editor');

        if (!isPayer && !canEdit) {
            return sendError(res, 403, 'You do not have permission to update this expense.');
        }

        // 3. Validate amounts if participants or amount are updated
        const { description, amount, category, participants } = req.body;
        if (amount || participants) {
            const newAmount = amount || expense.amount;
            const newParticipants = participants || expense.participants;
            const totalShare = newParticipants.reduce((sum, p) => sum + p.share, 0);

            if (Math.abs(totalShare - newAmount) > 0.01) {
                return sendError(res, 400,  'The sum of participant shares must equal the total expense amount.');
            }
        }

        // 4. Update the expense fields
        expense.description = description || expense.description;
        expense.amount = amount || expense.amount;
        expense.category = category || expense.category;
        expense.participants = participants || expense.participants;

        await expense.save();

        calculateAndCacheSettlements(req.params.tripId);

        // 5. Notify group members of the update
        const notificationPayload = { tripId: req.params.tripId, expense: expense }; 
        notificationService.broadcastToTrip(req.params.tripId, 'expenseUpdated', notificationPayload);

        logger.info(`Expense ${expenseId} on trip ${tripId} updated by ${req.user.email}`);
        return sendSuccess(res, 200, true, 'Expense updated successfully.', expense);

    } catch (error) {
        logger.error(`Error updating expense ${expenseId}: ${error.message}`);
        return sendError(res, 500, 'Failed to update expense.');
    }
};


/**
 * @desc    Delete an expense.
 * @route   DELETE /api/trips/:tripId/expenses/:expenseId
 * @access  Private (Trip Owner/Editor or Payer)
 */
exports.deleteExpense = async (req, res) => {
    const { tripId, expenseId } = req.params;
    const userId = req.user._id;

    try {
        // 1. Fetch the trip and the specific expense
        const trip = await Trip.findById(tripId);
        if (!trip) {
            return sendError(res, 404, 'Trip not found.');
        }

        const expense = await Expense.findById(expenseId);
        if (!expense || expense.tripId.toString() !== tripId) {
            return sendError(res, 404, 'Expense not found on this trip.');
        }

        // 2. Verify permissions
        const member = trip.group.members.find(m => m.userId.equals(userId));
        const isPayer = expense.paidBy.equals(userId);
        const canDelete = member && (member.role === 'owner' || member.role === 'editor');

        if (!isPayer && !canDelete) {
            return sendError(res, 403,  'You do not have permission to delete this expense.');
        }

        // 3. Delete the expense
        await expense.deleteOne();

        calculateAndCacheSettlements(req.params.tripId);

        // 4. Notify group members of the deletion
        const notificationPayload = { tripId, expenseId };
        notificationService.broadcastToTrip(tripId, 'expenseDeleted', notificationPayload);

        logger.info(`Expense ${expenseId} on trip ${tripId} deleted by ${req.user.email}`);
        return sendSuccess(res, 200, true, 'Expense deleted successfully.');

    } catch (error) {
        logger.error(`Error deleting expense ${expenseId}: ${error.message}`);
        return sendError(res, 500,  'Failed to delete expense.');
    }
};