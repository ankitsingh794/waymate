const { Server } = require('socket.io');
const logger = require('./logger');
const { createAdapter } = require('@socket.io/redis-adapter'); 
const { createClient } = require('redis');
const { authenticateSocket } = require('../middlewares/socketAuthMiddleware');
const Message = require('../models/Message');
const ChatSession = require('../models/ChatSession');
const aiChatService = require('../services/aiChatService');


let io = null;

const initSocketIO = (httpServer) => {
  const allowedOrigins = [
    process.env.CLIENT_URL, 
    'http://localhost:5173'
  ];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
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

  io.on('connection', (socket) => {
    try {
      logger.info(`🔌 Socket connected: ${socket.id} for user ${socket.user.id}`);

      socket.join(socket.user.id.toString());

      socket.on('joinSession', (sessionId) => {
        socket.join(sessionId);
        logger.info(`User ${socket.user.id} joined session room: ${sessionId}`);
      });

      socket.on('leaveSession', (sessionId) => {
        socket.leave(sessionId);
        logger.info(`User ${socket.user.id} left session room: ${sessionId}`);
      });

      socket.on('sendMessage', async (data) => {
        const { sessionId, text } = data;
        const sender = socket.user; 

        if (!sessionId || !text) {
          return socket.emit('error', { message: 'Session ID and text are required.' });
        }

        if (text.trim().toLowerCase().startsWith('@waymate')) {
          const command = text.trim().substring(7).trim();
          logger.info(`AI edit command received from ${sender.email}: "${command}"`);

          io.to(sessionId).emit('newMessage', {
            chatSession: sessionId,
            type: 'system',
            text: `${sender.name} asked WayMate to edit the trip...`,
            createdAt: new Date(),
          });

          aiChatService.handleTripEditRequest(sessionId, sender, command);

        } else {
          try {
            const session = await ChatSession.findOne({ _id: sessionId, participants: sender._id });
            if (!session) return socket.emit('error', { message: 'You are not a member of this chat session.' });

            const newMessage = new Message({
              chatSession: sessionId,
              sender: sender._id,
              text: text,
              type: 'user',
            });
            await newMessage.save();

            const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name profileImage');
            session.lastMessage = { text: populatedMessage.text, sentAt: populatedMessage.createdAt };
            await session.save();

            io.to(sessionId).emit('newMessage', populatedMessage);
          } catch (error) {
            logger.error(`Error in sendMessage event: ${error.message}`);
            socket.emit('error', { message: 'Failed to send message.' });
          }
        }
      });


      socket.on('disconnect', () => {
        logger.info(`🔌 Client disconnected: ${socket.id}`);
      });

    } catch (error) {
      logger.error(`Unhandled error in socket connection handler: ${error.message}`, { socketId: socket.id });
    }
  });

  return io;
};

/**
 * Returns the initialized Socket.IO server instance.
 * @returns {object} The Socket.IO server instance.
 */
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
