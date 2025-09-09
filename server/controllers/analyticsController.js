const analyticsService = require('../services/analyticsService');
const { sendSuccess } = require('../utils/responseHelper');

exports.getTripStats = async (req, res, next) => {
    try {
        const stats = await analyticsService.getTripStats(req.query);
        sendSuccess(res, 200, 'Trip statistics fetched successfully.', { stats });
    } catch (error) {
        next(error);
    }
};

exports.getModeDistribution = async (req, res, next) => {
    try {
        const distribution = await analyticsService.getModeDistribution(req.query);
        sendSuccess(res, 200, 'Transport mode distribution fetched successfully.', { distribution });
    } catch (error) {
        next(error);
    }
};

exports.getPurposeDistribution = async (req, res, next) => {
    try {
        const distribution = await analyticsService.getPurposeDistribution(req.query);
        sendSuccess(res, 200, 'Trip purpose distribution fetched successfully.', { distribution });
    } catch (error) {
        next(error);
    }
};


exports.getCoTravelerFrequency = async (req, res, next) => {
    try {
        const { memberA, memberB } = req.query; // Expecting hashed member IDs
        const frequencyData = await analyticsService.calculateCoTravelerFrequency(memberA, memberB);
        sendSuccess(res, 200, 'Co-traveler frequency calculated.', { data: frequencyData });
    } catch (error) {
        next(error);
    }
};
