const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Trip = require('../models/Trip');
const ChatSession = require('../models/ChatSession');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { isTokenBlacklisted } = require('../config/redis');
const Household = require('../models/Household');

/**
 * Main authentication middleware to protect routes.
 * Verifies the JWT, checks for blacklisted tokens, and validates the user session.
 */
exports.protect = async (req, res, next) => {
    try {
        let accessToken;
        if (req.headers.authorization?.startsWith('Bearer')) {
            accessToken = req.headers.authorization.split(' ')[1];
        }

        if (!accessToken) {
            return next(new AppError('Authentication failed. Please log in.', 401));
        }

        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

        if (await isTokenBlacklisted(decoded.jti)) {
            return next(new AppError('Authentication failed. Token has been invalidated.', 401));
        }

        const user = await User.findById(decoded.id).select('+passwordChangedAt');
        
        if (!user) {
            return next(new AppError('The user belonging to this token no longer exists.', 401));
        }

        if (user.accountStatus !== 'active') {
            return next(new AppError(`Access denied. Your account is ${user.accountStatus}.`, 403));
        }

        if (user.passwordChangedAt && (decoded.iat * 1000 < user.passwordChangedAt.getTime())) {
            return next(new AppError('Password was recently changed. Please log in again.', 401));
        }

        req.user = user;
        next();
    } catch (error) {
        return next(new AppError('Authentication failed. Token is invalid or expired.', 401));
    }
};

/**
 * Role-based access control middleware.
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'editor').
 */
exports.authorizeRoles = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        logger.warn(`Authorization failed for ${req.user.email} (Role: ${req.user.role}) trying to access role-protected route: ${req.originalUrl}`);
        return next(new AppError('Access denied. You do not have permission to perform this action.', 403));
    }
    next();
};

/**
 * Authorization middleware to verify if the user is a member of a Trip.
 */
exports.isTripMember = async (req, res, next) => {
    const tripId = req.params.id || req.params.tripId;
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
        return next(new AppError('Invalid trip ID.', 400));
    }
    
    const trip = await Trip.findOne({ _id: tripId, 'group.members.userId': req.user._id });

    if (!trip) {
        return next(new AppError('You are not authorized to access this trip.', 403));
    }
    req.trip = trip; 
    next();
};

/**
 * Authorization middleware to verify if the user is the owner of a Trip.
 */
exports.isTripOwner = async (req, res, next) => {
    const tripId = req.params.id || req.params.tripId;
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
        return next(new AppError('Invalid trip ID.', 400));
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
        return next(new AppError('Trip not found.', 404));
    }

    const member = trip.group.members.find(m => m.userId.equals(req.user._id));
    if (!member || member.role !== 'owner') {
        return next(new AppError('Access denied. Only the trip owner can perform this action.', 403));
    }

    req.trip = trip;
    next();
};


/**
 * Authorization middleware to verify if the user is a member of a ChatSession.
 */
exports.isChatMember = async (req, res, next) => {
    const sessionId = req.body.sessionId || req.params.sessionId;
    if (!sessionId) {
        return next(new AppError('A valid session ID is required.', 400));
    }
    const session = await ChatSession.findOne({ _id: sessionId, participants: req.user._id });

    if (!session) {
        return next(new AppError('You are not authorized to access this chat session.', 403));
    }
    next();
};

/**
 * Authorization middleware to verify if the user is the head of their household.
 * It also fetches and attaches the household object to the request (`req.household`).
 */
exports.isHouseholdHead = async (req, res, next) => {
    try {
        const householdId = req.user.householdId;

        if (!householdId) {
            return next(new AppError('You are not a member of any household.', 403));
        }

        const household = await Household.findById(householdId);

        if (!household) {
            return next(new AppError('Household not found.', 404));
        }

        const member = household.members.find(m => m.userId.equals(req.user._id));

        if (!member || member.role !== 'head') {
            return next(new AppError('Access denied. Only the household head can perform this action.', 403));
        }

        req.household = household;
        next();

    } catch (error) {
        next(error);
    }
};