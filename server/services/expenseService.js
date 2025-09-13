const Trip = require('../models/Trip');
const Expense = require('../models/Expense');
const { setCache } = require('../config/redis');
const logger = require('../utils/logger');

const CACHE_KEY_PREFIX = 'settlements:';
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 1 week

/**
 * Calculates the full expense summary and settlement plan for a trip and caches it.
 * @param {string} tripId The ID of the trip to calculate.
 * @returns {Promise<object|null>} The calculated summary object or null on failure.
 */
const calculateAndCacheSettlements = async (tripId) => {
    try {
        logger.info(`Recalculating and caching settlement for trip: ${tripId}`);
        const trip = await Trip.findById(tripId).populate('group.members.userId', 'name email profileImage');
        if (!trip) {
            throw new Error(`Trip not found for settlement calculation: ${tripId}`);
        }

        const expenses = await Expense.find({ tripId }).populate('paidBy', 'name');
        
        const userMap = new Map(trip.group.members.map(m => [m.userId._id.toString(), m.userId]));
        const balances = new Map();
        trip.group.members.forEach(member => balances.set(member.userId._id.toString(), 0));

        expenses.forEach(expense => {
            const paidByStr = expense.paidBy._id.toString();
            balances.set(paidByStr, (balances.get(paidByStr) || 0) + expense.amount);
            expense.participants.forEach(p => {
                const participantIdStr = p.userId.toString();
                balances.set(participantIdStr, (balances.get(participantIdStr) || 0) - p.share);
            });
        });

        const creditors = [];
        const debtors = [];
        balances.forEach((amount, userId) => {
            if (amount > 0.01) creditors.push({ userId, amount });
            if (amount < -0.01) debtors.push({ userId, amount: -amount });
        });

        const settlements = [];
        let i = 0, j = 0;
        while (i < creditors.length && j < debtors.length) {
            const creditor = creditors[i];
            const debtor = debtors[j];
            const amountToSettle = Math.min(creditor.amount, debtor.amount);
            settlements.push({
                from: {
                    _id: debtor.userId,
                    name: userMap.get(debtor.userId).name
                },
                to: {
                    _id: creditor.userId, 
                    name: userMap.get(creditor.userId).name
                },
                amount: parseFloat(amountToSettle.toFixed(2))
            });
            creditor.amount -= amountToSettle;
            debtor.amount -= amountToSettle;
            if (creditor.amount < 0.01) i++;
            if (debtor.amount < 0.01) j++;
        }
        
        const summary = {
            totalSpent: expenses.reduce((sum, e) => sum + e.amount, 0),
            settlements,
            currency: trip.preferences?.currency || 'INR' 
        };

        await setCache(`${CACHE_KEY_PREFIX}${tripId}`, summary, CACHE_TTL_SECONDS);
        logger.info(`Successfully cached settlement for trip: ${tripId}`);
        
        return summary;
    } catch (error) {
        logger.error(`Error calculating settlement for trip ${tripId}:`, { message: error.message });
        return null;
    }
};

module.exports = { calculateAndCacheSettlements, CACHE_KEY_PREFIX };