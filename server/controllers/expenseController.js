const Expense = require('../models/Expense');
const Trip = require('../models/Trip');
const { sendResponse } = require('../utils/responseHelper');
const logger = require('../utils/logger');
const { getSocketIO } = require('../utils/socket');

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
            return sendResponse(res, 404, false, 'Trip not found or you are not a member.');
        }

        // 2. Validate the paidBy user exists in the trip's members.const memberIds = new Set(trip.group.members.map(m => m.userId.toString()));
        for (const p of participants) {
            if (!memberIds.has(p.userId.toString())) {
                return sendResponse(res, 400, false, `User with ID ${p.userId} is not a member of this trip.`);
            }
        }

        // 2. Validate the expense data.
        const totalShare = participants.reduce((sum, p) => sum + p.share, 0);
        if (Math.abs(totalShare - amount) > 0.01) { // Allow for small floating point discrepancies
            return sendResponse(res, 400, false, 'The sum of participant shares must equal the total expense amount.');
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

        // 4. Notify all group members via WebSockets.
        const io = getSocketIO();
        trip.group.members.forEach(member => {
            io.to(member.userId.toString()).emit('expenseAdded', {
                tripId,
                expense: newExpense,
                message: `${req.user.name} added a new expense: ${description}`
            });
        });

        logger.info(`New expense added to trip ${tripId} by ${req.user.email}`);
        return sendResponse(res, 201, true, 'Expense added successfully.', newExpense);

    } catch (error) {
        logger.error(`Error adding expense to trip ${tripId}: ${error.message}`);
        return sendResponse(res, 500, false, 'Failed to add expense.');
    }
};

/**
 * @desc    Get all expenses and calculate the balance sheet for a trip.
 * @route   GET /api/trips/:tripId/expenses
 * @access  Private (Group members only)
 */
exports.getTripExpenses = async (req, res) => {
    const { tripId } = req.params;
    const userId = req.user._id;



    try {
        const trip = await Trip.findOne({ _id: tripId, 'group.members.userId': userId })
            .populate('group.members.userId', 'username email profile.avatar'); // Populate for summary
        if (!trip) {
            return sendResponse(res, 404, false, 'Trip not found or you are not a member.');
        }

        const userMap = new Map(trip.group.members.map(m => [m.userId._id.toString(), m.userId]));

        const expenses = await Expense.find({ tripId }).populate('paidBy', 'username');

        // --- Balance Calculation Logic ---
        const balances = new Map();
        trip.group.members.forEach(member => balances.set(member.userId._id.toString(), 0));

        expenses.forEach(expense => {
            // The person who paid gets credited.
            const paidByStr = expense.paidBy._id.toString();
            balances.set(paidByStr, (balances.get(paidByStr) || 0) + expense.amount);

            // Each participant gets debited for their share.
            expense.participants.forEach(p => {
                const participantIdStr = p.userId.toString();
                balances.set(participantIdStr, (balances.get(participantIdStr) || 0) - p.share);
            });
        });

        // --- Settlement Calculation (Who owes whom) ---
        const creditors = [];
        const debtors = [];
        balances.forEach((amount, userId) => {
            if (amount > 0) creditors.push({ userId, amount });
            if (amount < 0) debtors.push({ userId, amount: -amount }); // Store as positive value
        });

        const settlements = [];
        let i = 0, j = 0;
        while (i < creditors.length && j < debtors.length) {
            const creditor = creditors[i];
            const debtor = debtors[j];
            const amountToSettle = Math.min(creditor.amount, debtor.amount);

            settlements.push({
                from: userMap.get(debtor.userId), // O(1) lookup
                to: userMap.get(creditor.userId),   // O(1) lookup
                amount: parseFloat(amountToSettle.toFixed(2))
            });

            creditor.amount -= amountToSettle;
            debtor.amount -= amountToSettle;

            if (creditor.amount < 0.01) i++;
            if (debtor.amount < 0.01) j++;
        }

        return sendResponse(res, 200, true, 'Expenses and balances fetched successfully.', {
            expenses,
            summary: {
                totalSpent: expenses.reduce((sum, e) => sum + e.amount, 0),
                settlements
            }
        });

    } catch (error) {
        logger.error(`Error fetching expenses for trip ${tripId}: ${error.message}`);
        return sendResponse(res, 500, false, 'Failed to fetch expenses.');
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
            return sendResponse(res, 404, false, 'Trip not found.');
        }

        const expense = await Expense.findById(expenseId);
        if (!expense || expense.tripId.toString() !== tripId) {
            return sendResponse(res, 404, false, 'Expense not found on this trip.');
        }

        // 2. Verify permissions
        const member = trip.group.members.find(m => m.userId.equals(userId));
        const isPayer = expense.paidBy.equals(userId);
        const canEdit = member && (member.role === 'owner' || member.role === 'editor');

        if (!isPayer && !canEdit) {
            return sendResponse(res, 403, false, 'You do not have permission to update this expense.');
        }

        // 3. Validate amounts if participants or amount are updated
        const { description, amount, category, participants } = req.body;
        if (amount || participants) {
            const newAmount = amount || expense.amount;
            const newParticipants = participants || expense.participants;
            const totalShare = newParticipants.reduce((sum, p) => sum + p.share, 0);

            if (Math.abs(totalShare - newAmount) > 0.01) {
                return sendResponse(res, 400, false, 'The sum of participant shares must equal the total expense amount.');
            }
        }
        
        // 4. Update the expense fields
        expense.description = description || expense.description;
        expense.amount = amount || expense.amount;
        expense.category = category || expense.category;
        expense.participants = participants || expense.participants;

        await expense.save();

        // 5. Notify group members of the update
        const io = getSocketIO();
        trip.group.members.forEach(m => {
            io.to(m.userId.toString()).emit('expenseUpdated', {
                tripId,
                expense,
                message: `An expense was updated by ${req.user.name}.`
            });
        });
        
        logger.info(`Expense ${expenseId} on trip ${tripId} updated by ${req.user.email}`);
        return sendResponse(res, 200, true, 'Expense updated successfully.', expense);

    } catch (error) {
        logger.error(`Error updating expense ${expenseId}: ${error.message}`);
        return sendResponse(res, 500, false, 'Failed to update expense.');
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
            return sendResponse(res, 404, false, 'Trip not found.');
        }

        const expense = await Expense.findById(expenseId);
        if (!expense || expense.tripId.toString() !== tripId) {
            return sendResponse(res, 404, false, 'Expense not found on this trip.');
        }

        // 2. Verify permissions
        const member = trip.group.members.find(m => m.userId.equals(userId));
        const isPayer = expense.paidBy.equals(userId);
        const canDelete = member && (member.role === 'owner' || member.role === 'editor');

        if (!isPayer && !canDelete) {
            return sendResponse(res, 403, false, 'You do not have permission to delete this expense.');
        }

        // 3. Delete the expense
        await expense.deleteOne();

        // 4. Notify group members of the deletion
        const io = getSocketIO();
        trip.group.members.forEach(m => {
            io.to(m.userId.toString()).emit('expenseDeleted', {
                tripId,
                expenseId,
                message: `An expense was deleted by ${req.user.name}.`
            });
        });
        
        logger.info(`Expense ${expenseId} on trip ${tripId} deleted by ${req.user.email}`);
        return sendResponse(res, 200, true, 'Expense deleted successfully.');

    } catch (error) {
        logger.error(`Error deleting expense ${expenseId}: ${error.message}`);
        return sendResponse(res, 500, false, 'Failed to delete expense.');
    }
};