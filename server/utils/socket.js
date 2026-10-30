const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const User = require('../models/User');
const logger = require('../utils/logger');
const redisCache = require('../config/redis');

let io = null;

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      logger.warn('[Socket Auth] Authentication failed: Missing token.');
      return next(new Error('Authentication failed: Missing token'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        logger.warn(`[Socket Auth] Token expired for connection: ${socket.id}`);
        return next(new Error('Authentication failed: Token expired'));
      }
      logger.warn(`[Socket Auth] Invalid token: ${jwtError.message}`);
      return next(new Error('Authentication failed: Invalid token'));
    }

    if (!decoded.jti) {
      logger.warn('[Socket Auth] Token missing JTI.');
      return next(new Error('Authentication failed: Token missing ID'));
    }

    const isBlacklisted = await redisCache.isTokenBlacklisted(decoded.jti);
    if (isBlacklisted) {
      logger.warn(`[Socket Auth] Blacklisted token rejected: ${decoded.jti}`);
      return next(new Error('Authentication failed: Token has been invalidated'));
    }

    const user = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!user || user.accountStatus !== 'active') {
      const reason = !user ? 'User not found' : `User account status is ${user.accountStatus}`;
      logger.warn(`[Socket Auth] Authentication rejected: ${reason}`);
      return next(new Error('Authentication failed: User invalid'));
    }

    if (user.passwordChangedAt && decoded.iat * 1000 < new Date(user.passwordChangedAt).getTime()) {
      logger.warn('[Socket Auth] Password changed after token issuance.');
      return next(new Error('Authentication failed: Credentials changed'));
    }

    socket.user = user;
    next();
  } catch (error) {
    logger.error(`[Socket Auth] Unexpected error: ${error.message}`);
    next(new Error('Authentication failed'));
  }
};

const getSocketIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call initSocketIO first.');
  }
  return io;
};

/**
 * Initializes the Socket.IO server.
 * @param {object} httpServer The Node.js HTTP server instance.
 * @returns {object} The configured Socket.IO server instance.
 */
const initSocketIO = (httpServer) => {
  const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'https://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean);

  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`Socket.IO CORS blocked request from origin: ${origin}`);
        callback(new Error('CORS origin not allowed'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    maxHttpBufferSize: 1e6, // 1MB payload limit to prevent buffer overflow attacks
  };

  io = new Server(httpServer, {
    cors: corsOptions,
  });

  const onConnection = (socket) => {
    logger.info(`✅ Socket connected: ${socket.id} for user ${socket.user.email}`);
    // Private user notification channel
    socket.join(socket.user._id.toString());

    // Secure session join with participant authorization check
    socket.on('joinSession', async (sessionId) => {
      try {
        const roomId = typeof sessionId === 'string' ? sessionId : sessionId?.sessionId;

        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
          socket.emit('socketError', { message: 'Invalid session ID provided.' });
          return;
        }

        // Lazy load ChatSession model
        const ChatSession = require('../models/ChatSession');
        const session = await ChatSession.findOne({
          _id: roomId,
          participants: socket.user._id,
        });

        if (!session) {
          logger.warn(`[Security Alert] User ${socket.user.email} attempted to join unauthorized session room ${roomId}`);
          socket.emit('socketError', { message: 'Access denied: You are not a member of this chat session.' });
          return;
        }

        socket.join(roomId);
        logger.info(`🏠 Socket ${socket.id} (${socket.user.email}) joined authorized session ${roomId}`);
        socket.emit('sessionJoined', { sessionId: roomId, message: 'Successfully joined session' });
      } catch (err) {
        logger.error(`Error in joinSession socket handler: ${err.message}`);
        socket.emit('socketError', { message: 'Failed to join session.' });
      }
    });

    socket.on('leaveSession', (sessionId) => {
      const roomId = typeof sessionId === 'string' ? sessionId : sessionId?.sessionId;
      if (roomId && typeof roomId === 'string') {
        socket.leave(roomId);
        logger.debug(`Socket ${socket.id} left session ${roomId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Client disconnected: ${socket.id}. Reason: ${reason}`);
    });
  };

  (async () => {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;
    const redisPort = process.env.REDIS_PORT;

    if (redisUrl || (redisHost && redisPort)) {
      try {
        const redisOptions = redisUrl ? { url: redisUrl } : { socket: { host: redisHost, port: redisPort } };
        const pubClient = createClient(redisOptions);
        const subClient = pubClient.duplicate();

        [pubClient, subClient].forEach((client) => {
          client.on('error', (err) => logger.error('❌ Socket.IO Redis client error', err));
        });

        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Socket.IO is using the Redis adapter for scalability.');
      } catch (err) {
        logger.error('❌ Failed to connect Socket.IO to Redis adapter. Running in standalone fallback mode.', err);
      }
    } else {
      logger.warn('⚠️  Redis not configured for Socket.IO. Running in standalone mode.');
    }

    io.use(authenticateSocket);
    io.on('connection', onConnection);

    const notificationService = require('../services/notificationService');
    notificationService.initNotificationService(io);
  })();

  return io;
};

module.exports = {
  initSocketIO,
  authenticateSocket,
  getSocketIO,
};
