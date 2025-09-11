const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const User = require('../models/User');
const logger = require('../utils/logger');
const redisCache = require('../config/redis');

let io = null;

const authenticateSocket = async (socket, next) => {
  logger.debug('--- [SOCKET AUTHENTICATION START] ---');
  logger.debug(`[1/7] New socket connection attempt from handshake: ${JSON.stringify(socket.handshake.auth)}`);

  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      logger.warn('[FAIL] Authentication failed: Missing token.');
      return next(new Error('Authentication failed: Missing token'));
    }
    logger.debug('[2/7] Token found in handshake.');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.debug(`[3/7] JWT verification successful. Decoded payload:`, decoded);

    if (!decoded.jti) {
      logger.warn('[FAIL] Authentication failed: Token missing JTI (JWT ID).');
      return next(new Error('Authentication failed: Token missing ID'));
    }
    logger.debug(`[4/7] JTI found: ${decoded.jti}`);

    const isBlacklisted = await redisCache.isTokenBlacklisted(decoded.jti);
    if (isBlacklisted) {
      logger.warn(`[FAIL] Authentication failed: Token with JTI ${decoded.jti} is blacklisted.`);
      return next(new Error('Authentication failed: Token has been invalidated'));
    }
    logger.debug('[5/7] Token is not blacklisted.');

    const user = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!user || user.accountStatus !== 'active') {
      const reason = !user ? 'User not found' : `User account status is ${user.accountStatus}`;
      logger.warn(`[FAIL] Authentication failed: ${reason}.`);
      return next(new Error('Authentication failed: User invalid'));
    }
    logger.debug(`[6/7] User found and active: ${user.email}`);

    if (user.passwordChangedAt && (decoded.iat * 1000) < new Date(user.passwordChangedAt).getTime()) {
      logger.warn('[FAIL] Authentication failed: Password was changed after token was issued.');
      return next(new Error('Authentication failed: Credentials changed'));
    }
    logger.debug('[7/7] Password change check passed.');

    logger.debug('--- [SOCKET AUTHENTICATION SUCCESS] ---');
    socket.user = user;
    next();

  } catch (error) {
    logger.error(`[CRASH] An unexpected error occurred during socket authentication: ${error.message}`, { stack: error.stack });
    next(new Error(`Authentication failed: ${error.message}`));
  }
};

/**
 * Initializes the Socket.IO server.
 * @param {object} httpServer The Node.js HTTP server instance.
 * @returns {object} The configured Socket.IO server instance.
 */
const initSocketIO = (httpServer) => {

  // --- FIX: A more robust, environment-aware CORS configuration ---
 const corsOptions = {
  // Allow connections from any origin. Your socket authentication 
  // middleware will handle security.
  origin: "*", 
  methods: ['GET', 'POST'],
  credentials: true,
};
logger.info('Socket.IO CORS configured to allow all origins.');
  io = new Server(httpServer, {
    cors: corsOptions,
  });

  // Define the connection handler logic once to be reused
  const onConnection = (socket) => {
    logger.info(`✅ Socket connected: ${socket.id} for user ${socket.user.email}`);
    socket.join(socket.user._id.toString());
    socket.on('joinSession', (sessionId) => {
      socket.join(sessionId);
      logger.debug(`Socket ${socket.id} joined session ${sessionId}`);
    });
    socket.on('leaveSession', (sessionId) => {
      socket.leave(sessionId);
      logger.debug(`Socket ${socket.id} left session ${sessionId}`);
    });
    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Client disconnected: ${socket.id}. Reason: ${reason}`);
    });
  };

  // Use an async IIFE (Immediately Invoked Function Expression) to handle setup
  (async () => {
    // --- Redis Adapter for Scalability ---
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;
    const redisPort = process.env.REDIS_PORT;

    if (redisUrl || (redisHost && redisPort)) {
      try {
        const redisOptions = redisUrl ? { url: redisUrl } : { socket: { host: redisHost, port: redisPort } };
        const pubClient = createClient(redisOptions);
        const subClient = pubClient.duplicate();

        // Register error handlers before connecting
        [pubClient, subClient].forEach(client => {
          client.on('error', (err) => logger.error('❌ Socket.IO Redis client error', err));
        });

        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Socket.IO is using the Redis adapter for scalability.');
      } catch (err) {
        logger.error('❌ CRITICAL: Failed to connect Socket.IO to Redis adapter. Exiting.', err);
        process.exit(1);
      }
    } else {
      logger.warn('⚠️  Redis not configured for Socket.IO. Running in standalone mode.');
    }

    io.use(authenticateSocket);
    io.on('connection', onConnection);

    // Late-import to prevent circular dependencies
    const notificationService = require('../services/notificationService');
    notificationService.initNotificationService(io);
  })();

  return io;
};

module.exports = {
  initSocketIO,
  authenticateSocket,
};