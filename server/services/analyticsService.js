const Trip = require('../models/Trip');
const mongoose = require('mongoose');
const User = require('../models/User');
/**
 * Helper function to build a date-based match query from request filters.
 * @param {object} filters - Query params like startDate and endDate.
 * @returns {object} A MongoDB match query object.
 */
const buildDateFilter = (filters) => {
    const matchQuery = {};
    if (filters.startDate || filters.endDate) {
        matchQuery.createdAt = {};
        if (filters.startDate) matchQuery.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) matchQuery.createdAt.$lte = new Date(filters.endDate);
    }
    return matchQuery;
};

/**
 * Calculates high-level statistics about all trips.
 */
const getTripStats = async (filters) => {
    const matchStage = buildDateFilter(filters);

    const stats = await Trip.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null, // Group all documents together
                totalTrips: { $sum: 1 },
                averageTravelers: { $avg: '$travelers' },
                averageDurationDays: {
                    $avg: {
                        $divide: [{ $subtract: ['$endDate', '$startDate'] }, 1000 * 60 * 60 * 24]
                    }
                }
            }
        },
        {
            $project: { // Shape the final output
                _id: 0,
                totalTrips: 1,
                averageTravelers: { $round: ['$averageTravelers', 1] },
                averageDurationDays: { $round: ['$averageDurationDays', 1] }
            }
        }
    ]);
    return stats[0] || { totalTrips: 0, averageTravelers: 0, averageDurationDays: 0 };
};

/**
 * Calculates the distribution of trips by transport mode.
 */
const getModeDistribution = async (filters) => {
    const matchStage = buildDateFilter(filters);

    return Trip.aggregate([
        { $match: matchStage },
        { $match: { 'preferences.transportMode': { $exists: true, $ne: null } } },
        {
            $group: {
                _id: '$preferences.transportMode', // Group by the transport mode
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                mode: '$_id',
                count: 1
            }
        },
        { $sort: { count: -1 } }
    ]);
};

/**
 * Calculates the distribution of trips by their purpose.
 */
const getPurposeDistribution = async (filters) => {
    const matchStage = buildDateFilter(filters);
    
    return Trip.aggregate([
        { $match: matchStage },
        { $match: { 'purpose': { $exists: true, $ne: null } } },
        {
            $group: {
                _id: '$purpose', // Group by the purpose field
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                purpose: '$_id',
                count: 1
            }
        },
        { $sort: { count: -1 } }
    ]);
};

/**
 * Calculates the number of trips two users have taken together.
 * @param {string} hashedIdA - The anonymized hash of the first user.
 * @param {string} hashedIdB - The anonymized hash of the second user.
 */
const calculateCoTravelerFrequency = async (hashedIdA, hashedIdB) => {
    if (!hashedIdA || !hashedIdB) {
        throw new AppError('Two member hashes (memberA, memberB) are required.', 400);
    }

    // This is computationally intensive and should only be used for targeted research.
    // It requires iterating through all users to find the original IDs.
    const allUsers = await User.find({}).select('_id').lean();
    
    let originalIdA = null;
    let originalIdB = null;

    for (const user of allUsers) {
        if (createAnonymousHash(user._id) === hashedIdA) {
            originalIdA = user._id;
        }
        if (createAnonymousHash(user._id) === hashedIdB) {
            originalIdB = user._id;
        }
        if (originalIdA && originalIdB) break;
    }

    if (!originalIdA || !originalIdB) {
        throw new AppError('One or both member hashes could not be found.', 404);
    }

    const tripCount = await Trip.countDocuments({
        'group.members.userId': { $all: [originalIdA, originalIdB] }
    });

    return {
        memberA_hash: hashedIdA,
        memberB_hash: hashedIdB,
        commonTrips: tripCount
    };
};


module.exports = {
    getTripStats,
    getModeDistribution,
    getPurposeDistribution,
    calculateCoTravelerFrequency,
};