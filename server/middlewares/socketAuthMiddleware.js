const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const authenticateSocket = async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
        logger.warn(`Socket connection rejected: No token provided. Socket ID: ${socket.id}`);
        return next(new Error('Authentication error: No token provided.'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findById(decoded.id).select('-password');

        if (!user || user.accountStatus !== 'active') {
            logger.warn(`Socket connection rejected: User not found or inactive. User ID: ${decoded.id}`);
            return next(new Error('Authentication error: User not found or inactive.'));
        }

        socket.user = user;
        next();

    } catch (error) {
        logger.error(`Socket authentication failed: ${error.message}`);
        next(new Error('Authentication error: Invalid token.'));
    }
};

module.exports = {
    authenticateSocket,
};