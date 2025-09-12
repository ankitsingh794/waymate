const Trip = require('../models/Trip');
const mongoose = require('mongoose');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const crypto = require('crypto');

// Helper function for anonymous hashing
const createAnonymousHash = (id) => {
    const ANONYMIZATION_SALT = process.env.ANONYMIZATION_SALT || 'waymate-analytics-salt';
    return crypto.createHmac('sha256', ANONYMIZATION_SALT)
        .update(id.toString())
        .digest('hex')
        .substring(0, 16);
};

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
                totalTravelers: { $sum: { $size: { $ifNull: ['$group.members', []] } } },
                averageGroupSize: { $avg: { $size: { $ifNull: ['$group.members', []] } } },
                averageDurationInDays: {
                    $avg: {
                        $cond: {
                            if: { $and: ['$startDate', '$endDate'] },
                            then: {
                                $divide: [
                                    { $subtract: ['$endDate', '$startDate'] },
                                    1000 * 60 * 60 * 24
                                ]
                            },
                            else: 0
                        }
                    }
                }
            }
        },
        {
            $project: { // Shape the final output
                _id: 0,
                totalTrips: 1,
                totalTravelers: 1,
                averageGroupSize: { $round: ['$averageGroupSize', 1] },
                averageDurationInDays: { $round: ['$averageDurationInDays', 1] }
            }
        }
    ]);

    return stats[0] || { 
        totalTrips: 0, 
        totalTravelers: 0, 
        averageGroupSize: 0, 
        averageDurationInDays: 0 
    };
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
        { $sort: { count: -1 } }
    ]);
};

/**
 * FIXED: Calculates the number of trips two users have taken together.
 */
const calculateCoTravelerFrequency = async (hashedIdA, hashedIdB) => {
    if (!hashedIdA || !hashedIdB) {
        throw new AppError('Two member hashes (memberA, memberB) are required.', 400);
    }

    if (hashedIdA === hashedIdB) {
        throw new AppError('Cannot analyze co-traveler frequency for the same member.', 400);
    }

    // Find original user IDs from hashes
    const allUsers = await User.find({}).select('_id').lean();
    
    let originalIdA = null;
    let originalIdB = null;

    for (const user of allUsers) {
        const userHash = createAnonymousHash(user._id.toString());
        if (userHash === hashedIdA) {
            originalIdA = user._id;
        }
        if (userHash === hashedIdB) {
            originalIdB = user._id;
        }
        if (originalIdA && originalIdB) break;
    }

    if (!originalIdA) {
        throw new AppError('Member A hash could not be found.', 404);
    }
    if (!originalIdB) {
        throw new AppError('Member B hash could not be found.', 404);
    }

    // Count trips where both users are members
    const tripCount = await Trip.countDocuments({
        'group.members.userId': { $all: [originalIdA, originalIdB] }
    });

    // Get additional insights
    const detailedStats = await Trip.aggregate([
        {
            $match: {
                'group.members.userId': { $all: [originalIdA, originalIdB] }
            }
        },
        {
            $group: {
                _id: null,
                totalTrips: { $sum: 1 },
                avgDuration: {
                    $avg: {
                        $cond: {
                            if: { $and: ['$startDate', '$endDate'] },
                            then: {
                                $divide: [
                                    { $subtract: ['$endDate', '$startDate'] },
                                    1000 * 60 * 60 * 24
                                ]
                            },
                            else: 0
                        }
                    }
                },
                purposes: { $addToSet: '$purpose' },
                transportModes: { $addToSet: '$preferences.transportMode' }
            }
        }
    ]);

    const stats = detailedStats[0] || {
        totalTrips: 0,
        avgDuration: 0,
        purposes: [],
        transportModes: []
    };

    return {
        memberA_hash: hashedIdA,
        memberB_hash: hashedIdB,
        commonTrips: tripCount,
        avgTripDuration: Math.round(stats.avgDuration * 10) / 10,
        commonPurposes: stats.purposes.filter(p => p != null),
        commonTransportModes: stats.transportModes.filter(m => m != null),
        analysisDate: new Date().toISOString()
    };
};


module.exports = {
    getTripStats,
    getModeDistribution,
    getPurposeDistribution,
    calculateCoTravelerFrequency,
};