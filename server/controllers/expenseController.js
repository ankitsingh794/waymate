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
        return sendSuccess(res, 201, 'Expense added successfully.', { expense: newExpense });

    } catch (error) {
        logger.error(`Error adding expense to trip ${tripId}: ${error.message}`);
        return sendSuccess(res, 500, 'Failed to add expense.');
    }
};

/**
 * @desc    Get all expenses and calculate the balance sheet for a trip.
 * @route   GET /api/trips/:tripId/expenses
 * @access  Private (Group members only)
 * @query   ?category=Food&sortBy=date&order=desc&minAmount=100&maxAmount=1000&startDate=2023-01-01&endDate=2023-12-31&limit=50&offset=0
 */
exports.getTripExpenses = async (req, res) => {
    const { tripId } = req.params;
    const { 
        category, 
        sortBy = 'createdAt', 
        order = 'desc', 
        minAmount, 
        maxAmount, 
        startDate, 
        endDate,
        limit,
        offset = 0
    } = req.query;

    try {
        const trip = await Trip.findOne({ _id: tripId, 'group.members.userId': req.user._id });
        if (!trip) {
            return sendError(res, 404, 'Trip not found or you are not a member.');
        }

        // Build filter query
        let filter = { tripId };

        if (category) {
            filter.category = category;
        }

        if (minAmount || maxAmount) {
            filter.amount = {};
            if (minAmount) filter.amount.$gte = parseFloat(minAmount);
            if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        // Build sort object
        const sortOrder = order === 'asc' ? 1 : -1;
        const sort = { [sortBy]: sortOrder };

        // Build query
        let query = Expense.find(filter).populate('paidBy', 'name email').sort(sort);

        if (limit) {
            query = query.limit(parseInt(limit)).skip(parseInt(offset));
        }

        const expenses = await query;

        // Get total count for pagination
        const totalExpenses = await Expense.countDocuments(filter);

        const cacheKey = `${CACHE_KEY_PREFIX}${tripId}`;
        let summary = await getCache(cacheKey);
        if (!summary) {
            summary = await calculateAndCacheSettlements(tripId);
        }

        return sendSuccess(res, 200, 'Expenses and balances fetched successfully.', {
            expenses,
            summary: summary || { totalSpent: 0, settlements: [], currency: trip.preferences?.currency || 'INR' },
            pagination: limit ? {
                total: totalExpenses,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + parseInt(limit)) < totalExpenses
            } : null
        });

    } catch (error) {
        logger.error(`Error fetching expenses for trip ${tripId}: ${error.message}`);
        return sendError(res, 500, 'Failed to fetch expenses.');
    }
};

/**
 * @desc    Update an existing expense.
 * @route   PATCH /api/trips/:tripId/expenses/:expenseId
 * @access  Private (Trip Owner/Editor or Payer)
 */
exports.updateExpense = async (req, res, next) => {
    const { tripId, expenseId } = req.params;
    const userId = req.user._id;

    try {
        const trip = await Trip.findById(tripId);
        if (!trip) {
            return sendError(res, 404, 'Trip not found.');
        }

        const expense = await Expense.findById(expenseId);
        if (!expense || expense.tripId.toString() !== tripId) {
            return sendError(res, 404, 'Expense not found on this trip.');
        }

        const member = trip.group.members.find(m => m.userId.equals(userId));
        const isPayer = expense.paidBy.equals(userId);
        const canEdit = member && (member.role === 'owner' || member.role === 'editor');

        if (!isPayer && !canEdit) {
            return sendError(res, 403, 'You do not have permission to update this expense.');
        }

        const { description, amount, category, participants } = req.body;
        if (amount || participants) {
            const newAmount = amount !== undefined ? amount : expense.amount;
            const newParticipants = participants || expense.participants;
            const totalShare = newParticipants.reduce((sum, p) => sum + p.share, 0);

            if (Math.abs(totalShare - newAmount) > 0.01) {
                return sendError(res, 400, 'The sum of participant shares must equal the total expense amount.');
            }
        }

        expense.description = description || expense.description;
        expense.amount = amount !== undefined ? amount : expense.amount;
        expense.category = category || expense.category;
        expense.participants = participants || expense.participants;

        await expense.save();
        calculateAndCacheSettlements(req.params.tripId);

        const notificationPayload = { tripId: req.params.tripId, expense: expense };
        notificationService.broadcastToTrip(req.params.tripId, 'expenseUpdated', notificationPayload);

        logger.info(`Expense ${expenseId} on trip ${tripId} updated by ${req.user.email}`);
        
        // FIX: Use the correct 'expense' variable and wrap it in a data object.
        return sendSuccess(res, 200, 'Expense updated successfully.', { expense });

    } catch (error) {
        // Pass to the global error handler for consistent error responses.
        next(error);
    }
};


/**
 * @desc    Delete an expense.
 * @route   DELETE /api/trips/:tripId/expenses/:expenseId
 * @access  Private (Trip Owner/Editor or Payer)
 */
exports.deleteExpense = async (req, res, next) => {
    const { tripId, expenseId } = req.params;
    const userId = req.user._id;

    try {
        const trip = await Trip.findById(tripId);
        if (!trip) {
            return sendError(res, 404, 'Trip not found.');
        }

        const expense = await Expense.findById(expenseId);
        if (!expense || expense.tripId.toString() !== tripId) {
            return sendError(res, 404, 'Expense not found on this trip.');
        }

        const member = trip.group.members.find(m => m.userId.equals(userId));
        const isPayer = expense.paidBy.equals(userId);
        const canDelete = member && (member.role === 'owner' || member.role === 'editor');

        if (!isPayer && !canDelete) {
            return sendError(res, 403, 'You do not have permission to delete this expense.');
        }

        await expense.deleteOne();
        calculateAndCacheSettlements(req.params.tripId);

        const notificationPayload = { tripId, expenseId };
        notificationService.broadcastToTrip(tripId, 'expenseDeleted', notificationPayload);

        logger.info(`Expense ${expenseId} on trip ${tripId} deleted by ${req.user.email}`);
        
        // FIX: Remove the extra 'true' argument.
        return sendSuccess(res, 200, 'Expense deleted successfully.');

    } catch (error) {
        // Pass to the global error handler.
        next(error);
    }
};

/**
 * @desc    Bulk delete multiple expenses.
 * @route   DELETE /api/trips/:tripId/expenses/bulk
 * @access  Private (Trip Owner/Editor or Payer for each expense)
 */
exports.bulkDeleteExpenses = async (req, res) => {
    const { tripId } = req.params;
    const { expenseIds } = req.body;
    const userId = req.user._id;

    try {
        if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
            return sendError(res, 400, 'Expense IDs array is required.');
        }

        const trip = await Trip.findById(tripId);
        if (!trip) {
            return sendError(res, 404, 'Trip not found.');
        }

        const member = trip.group.members.find(m => m.userId.equals(userId));
        const canDeleteAll = member && (member.role === 'owner' || member.role === 'editor');

        const expenses = await Expense.find({ 
            _id: { $in: expenseIds },
            tripId: tripId
        });

        if (expenses.length !== expenseIds.length) {
            return sendError(res, 404, 'Some expenses not found on this trip.');
        }

        // Check permissions for each expense
        for (const expense of expenses) {
            const isPayer = expense.paidBy.equals(userId);
            if (!isPayer && !canDeleteAll) {
                return sendError(res, 403, `You do not have permission to delete expense ${expense._id}.`);
            }
        }

        // Delete all expenses
        await Expense.deleteMany({ _id: { $in: expenseIds } });
        calculateAndCacheSettlements(tripId);

        const notificationPayload = { tripId, deletedExpenseIds: expenseIds };
        notificationService.broadcastToTrip(tripId, 'expensesBulkDeleted', notificationPayload);

        logger.info(`Bulk deleted ${expenseIds.length} expenses from trip ${tripId} by ${req.user.email}`);
        
        return sendSuccess(res, 200, `Successfully deleted ${expenseIds.length} expenses.`, {
            deletedCount: expenseIds.length
        });

    } catch (error) {
        logger.error(`Error bulk deleting expenses from trip ${tripId}: ${error.message}`);
        return sendError(res, 500, 'Failed to delete expenses.');
    }
};

/**
 * @desc    Get expense analytics for a trip.
 * @route   GET /api/trips/:tripId/expenses/analytics
 * @access  Private (Group members only)
 */
exports.getExpenseAnalytics = async (req, res) => {
    const { tripId } = req.params;
    const { startDate, endDate } = req.query;

    try {
        const trip = await Trip.findOne({ _id: tripId, 'group.members.userId': req.user._id });
        if (!trip) {
            return sendError(res, 404, 'Trip not found or you are not a member.');
        }

        // Build date filter
        let dateFilter = { tripId };
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
            if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
        }

        // Get all expenses for the period
        const expenses = await Expense.find(dateFilter).populate('paidBy', 'name');

        // Calculate analytics
        const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalExpenses = expenses.length;
        const averageExpense = totalExpenses > 0 ? totalSpent / totalExpenses : 0;

        // Category breakdown
        const categoryBreakdown = expenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
            return acc;
        }, {});

        // Monthly spending (for trends)
        const monthlySpending = expenses.reduce((acc, expense) => {
            const month = expense.createdAt.toISOString().substr(0, 7); // YYYY-MM
            acc[month] = (acc[month] || 0) + expense.amount;
            return acc;
        }, {});

        // Top spenders
        const spenderBreakdown = expenses.reduce((acc, expense) => {
            const spenderId = expense.paidBy._id.toString();
            const spenderName = expense.paidBy.name;
            if (!acc[spenderId]) {
                acc[spenderId] = { name: spenderName, amount: 0, count: 0 };
            }
            acc[spenderId].amount += expense.amount;
            acc[spenderId].count += 1;
            return acc;
        }, {});

        const topSpenders = Object.entries(spenderBreakdown)
            .map(([id, data]) => ({ userId: id, ...data }))
            .sort((a, b) => b.amount - a.amount);

        // Recent expenses (last 10)
        const recentExpenses = expenses
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10);

        return sendSuccess(res, 200, 'Analytics fetched successfully.', {
            analytics: {
                totalSpent,
                totalExpenses,
                averageExpense,
                categoryBreakdown,
                monthlySpending,
                topSpenders,
                recentExpenses,
                currency: trip.preferences?.currency || 'INR'
            }
        });

    } catch (error) {
        logger.error(`Error fetching analytics for trip ${tripId}: ${error.message}`);
        return sendError(res, 500, 'Failed to fetch analytics.');
    }
};

/**
 * @desc    Export expenses to CSV format.
 * @route   GET /api/trips/:tripId/expenses/export
 * @access  Private (Group members only)
 */
exports.exportExpenses = async (req, res) => {
    const { tripId } = req.params;
    const { format = 'csv', startDate, endDate } = req.query;

    try {
        const trip = await Trip.findOne({ _id: tripId, 'group.members.userId': req.user._id });
        if (!trip) {
            return sendError(res, 404, 'Trip not found or you are not a member.');
        }

        // Build date filter
        let filter = { tripId };
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const expenses = await Expense.find(filter)
            .populate('paidBy', 'name email')
            .sort({ createdAt: -1 });

        if (format === 'csv') {
            // Generate CSV content
            const csvHeader = 'Date,Description,Amount,Category,Paid By,Participants\n';
            const csvRows = expenses.map(expense => {
                const date = expense.createdAt.toISOString().split('T')[0];
                const participants = expense.participants.map(p => `${p.userId}:${p.share}`).join(';');
                return `"${date}","${expense.description}","${expense.amount}","${expense.category}","${expense.paidBy.name}","${participants}"`;
            }).join('\n');

            const csvContent = csvHeader + csvRows;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="expenses_${tripId}_${Date.now()}.csv"`);
            return res.send(csvContent);
        }

        // Return JSON format for other formats or mobile processing
        return sendSuccess(res, 200, 'Expenses exported successfully.', {
            expenses,
            exportMetadata: {
                tripId,
                exportDate: new Date().toISOString(),
                totalExpenses: expenses.length,
                totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
                currency: trip.preferences?.currency || 'INR'
            }
        });

    } catch (error) {
        logger.error(`Error exporting expenses for trip ${tripId}: ${error.message}`);
        return sendError(res, 500, 'Failed to export expenses.');
    }
};

/**
 * @desc    Get budget information for a trip.
 * @route   GET /api/trips/:tripId/budget
 * @access  Private (Group members only)
 */
exports.getBudget = async (req, res) => {
    const { tripId } = req.params;

    try {
        const trip = await Trip.findOne({ _id: tripId, 'group.members.userId': req.user._id });
        if (!trip) {
            return sendError(res, 404, 'Trip not found or you are not a member.');
        }

        // Get current spending
        const expenses = await Expense.find({ tripId });
        const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        // Calculate category spending
        const categorySpending = expenses.reduce((acc, expense) => {
            acc[expense.category.toLowerCase()] = (acc[expense.category.toLowerCase()] || 0) + expense.amount;
            return acc;
        }, {});

        const budget = trip.budget || { total: 0 };
        const remaining = budget.total - totalSpent;
        const percentageUsed = budget.total > 0 ? (totalSpent / budget.total) * 100 : 0;

        // Calculate category budget status
        const categoryBudgetStatus = {};
        const categoryMapping = {
            food: 'food',
            transport: 'travel', 
            accommodation: 'accommodation',
            activities: 'activities'
        };

        Object.entries(categoryMapping).forEach(([expenseCategory, budgetCategory]) => {
            const budgetAmount = budget[budgetCategory] || 0;
            const spentAmount = categorySpending[expenseCategory] || 0;
            categoryBudgetStatus[expenseCategory] = {
                budget: budgetAmount,
                spent: spentAmount,
                remaining: budgetAmount - spentAmount,
                percentage: budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0
            };
        });

        return sendSuccess(res, 200, 'Budget information fetched successfully.', {
            budget: {
                total: budget.total,
                spent: totalSpent,
                remaining,
                percentageUsed,
                categoryBreakdown: budget,
                categoryStatus: categoryBudgetStatus,
                currency: trip.preferences?.currency || 'INR'
            }
        });

    } catch (error) {
        logger.error(`Error fetching budget for trip ${tripId}: ${error.message}`);
        return sendError(res, 500, 'Failed to fetch budget information.');
    }
};

/**
 * @desc    Update budget for a trip.
 * @route   PUT /api/trips/:tripId/budget
 * @access  Private (Trip Owner/Editor only)
 */
exports.updateBudget = async (req, res) => {
    const { tripId } = req.params;
    const { total, travel, accommodation, activities, food } = req.body;
    const userId = req.user._id;

    try {
        const trip = await Trip.findById(tripId);
        if (!trip) {
            return sendError(res, 404, 'Trip not found.');
        }

        const member = trip.group.members.find(m => m.userId.equals(userId));
        const canEdit = member && (member.role === 'owner' || member.role === 'editor');

        if (!canEdit) {
            return sendError(res, 403, 'You do not have permission to update the budget.');
        }

        // Validate budget values
        if (total && total < 0) {
            return sendError(res, 400, 'Total budget must be positive.');
        }

        const categorySum = (travel || 0) + (accommodation || 0) + (activities || 0) + (food || 0);
        if (total && categorySum > total) {
            return sendError(res, 400, 'Category budgets cannot exceed total budget.');
        }

        // Update budget
        trip.budget = {
            total: total || trip.budget?.total || 0,
            travel: travel || trip.budget?.travel || 0,
            accommodation: accommodation || trip.budget?.accommodation || 0,
            activities: activities || trip.budget?.activities || 0,
            food: food || trip.budget?.food || 0
        };

        await trip.save();

        const notificationPayload = { tripId, budget: trip.budget };
        notificationService.broadcastToTrip(tripId, 'budgetUpdated', notificationPayload);

        logger.info(`Budget updated for trip ${tripId} by ${req.user.email}`);
        
        return sendSuccess(res, 200, 'Budget updated successfully.', {
            budget: trip.budget
        });

    } catch (error) {
        logger.error(`Error updating budget for trip ${tripId}: ${error.message}`);
        return sendError(res, 500, 'Failed to update budget.');
    }
};