const { Server } = require('socket.io');
const logger = require('./logger');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const { authenticateSocket } = require('../middlewares/socketAuthMiddleware');
const Message = require('../models/Message');
const ChatSession = require('../models/ChatSession');
const aiChatService = require('../services/aiChatService');

// --- Centralized Socket Event Constants ---
const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN_SESSION: 'joinSession',
  LEAVE_SESSION: 'leaveSession',
  SEND_MESSAGE: 'sendMessage',
  NEW_MESSAGE: 'newMessage',
  ERROR: 'error',
};

let io = null;

const handleUserMessage = async (socket, sessionId, text) => {
    try {
        const sender = socket.user;
        const session = await ChatSession.findOne({ _id: sessionId, participants: sender._id });
        if (!session) {
            return socket.emit(SOCKET_EVENTS.ERROR, { message: 'You are not a member of this chat session.' });
        }

        const newMessage = await Message.create({
            chatSession: sessionId,
            sender: sender._id,
            text,
            type: 'user',
        });

        const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name profileImage');
        session.lastMessage = { text: populatedMessage.text, sentAt: populatedMessage.createdAt };
        await session.save();

        io.to(sessionId).emit(SOCKET_EVENTS.NEW_MESSAGE, populatedMessage);
    } catch (error) {
        logger.error(`Error in handleUserMessage: ${error.message}`);
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to send message.' });
    }
};

const handleAiCommand = (socket, sessionId, text) => {
    const sender = socket.user;
    const command = text.trim().substring(7).trim();
    logger.info(`AI command received from ${sender.email}: "${command}"`);

    io.to(sessionId).emit(SOCKET_EVENTS.NEW_MESSAGE, {
        chatSession: sessionId,
        type: 'system',
        text: `${sender.name} asked WayMate to process a command...`,
        createdAt: new Date(),
    });

    aiChatService.handleWaymateCommand(sessionId, sender, command);
};


const initSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [process.env.CLIENT_URL, 'http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('✅ Socket.IO Redis adapter connected successfully.');
  }).catch((err) => {
    logger.error('❌ Failed to connect Socket.IO Redis adapter', err);
  });

  io.use(authenticateSocket);

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    try {
      logger.info(`🔌 Socket connected: ${socket.id} for user ${socket.user.id}`);

      socket.join(socket.user.id.toString());

      socket.on(SOCKET_EVENTS.JOIN_SESSION, (sessionId) => {
        socket.join(sessionId);
        logger.info(`User ${socket.user.id} joined session room: ${sessionId}`);
      });

      socket.on(SOCKET_EVENTS.LEAVE_SESSION, (sessionId) => {
        socket.leave(sessionId);
        logger.info(`User ${socket.user.id} left session room: ${sessionId}`);
      });

      socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (data) => {
        const { sessionId, text } = data;
        if (!sessionId || !text) {
          return socket.emit(SOCKET_EVENTS.ERROR, { message: 'Session ID and text are required.' });
        }

        if (text.trim().toLowerCase().startsWith('@waymate')) {
          handleAiCommand(socket, sessionId, text);
        } else {
          await handleUserMessage(socket, sessionId, text);
        }
      });

      socket.on(SOCKET_EVENTS.DISCONNECT, () => {
        logger.info(`🔌 Client disconnected: ${socket.id}`);
      });

    } catch (error) {
      logger.error(`Unhandled error in socket connection handler: ${error.message}`, { socketId: socket.id });
    }
  });

  return io;
};

const getSocketIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized!');
  }
  return io;
};

module.exports = {
  initSocketIO,
  getSocketIO,
};