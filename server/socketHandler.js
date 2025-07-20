const { Server } = require('socket.io');
const logger = require('./utils/logger');
const Message = require('./models/Message');
const ChatSession = require('./models/ChatSession');
const { authenticateSocket } = require('./middlewares/socketAuthMiddleware');
const aiChatService = require('./services/aiChatService');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || '*',
            methods: ['GET', 'POST'],
        },
    });

    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id} for user ${socket.user.id}`);

        socket.on('joinSession', (sessionId) => {
            socket.join(sessionId);
            logger.info(`User ${socket.user.id} joined session room: ${sessionId}`);
        });

        // --- Event Listener for Leaving a Chat Session ---
        socket.on('leaveSession', (sessionId) => {
            socket.leave(sessionId);
            logger.info(`User ${socket.user.id} left session room: ${sessionId}`);
        });

        // This handler now routes messages to the group or the AI editor
        socket.on('sendMessage', async (data) => {
            const { sessionId, text } = data;
            const sender = socket.user;

            if (!sessionId || !text) {
                return socket.emit('error', { message: 'Session ID and text are required.' });
            }

            // Check if the message is an AI command
            if (text.trim().toLowerCase().startsWith('@waymate')) {
                // It's a command for the AI to edit the trip
                const command = text.trim().substring(7).trim(); // Get text after "@waymate"
                logger.info(`AI edit command received from ${sender.email}: "${command}"`);

                // Immediately notify the group that the AI is working on it
                io.to(sessionId).emit('newMessage', {
                    chatSession: sessionId,
                    type: 'system',
                    text: `${sender.name} asked WayMate to edit the trip...`,
                    createdAt: new Date(),
                });

                // Call the AI service to handle the edit
                aiChatService.handleTripEditRequest(sessionId, sender, command);

            } else {
                // It's a regular user-to-user message
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

                    const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name profile.avatar');
                    session.lastMessage = { text: populatedMessage.text, sentAt: populatedMessage.createdAt };
                    await session.save();

                    io.to(sessionId).emit('newMessage', populatedMessage);
                } catch (error) {
                    logger.error(`Error in sendMessage event: ${error.message}`);
                    socket.emit('error', { message: 'Failed to send message.' });
                }
            }
        });

        // Event Listener for AI Travel Chat ---
        socket.on('sendAiMessage', async (data) => {
            const { sessionId, text } = data;
            const userId = socket.user.id;

            if (!sessionId || !text) {
                return socket.emit('error', { message: 'Session ID and text are required.' });
            }

            try {
                // 1. Save the user's message to the database first
                const userMessageToSave = new Message({
                    chatSession: sessionId,
                    sender: userId,
                    text: text,
                    type: 'user',
                });
                await userMessageToSave.save();
                const populatedUserMessage = await Message.findById(userMessageToSave._id)
                    .populate('sender', 'name profile.avatar');

                // 2. Immediately broadcast the user's message so they see it
                io.to(sessionId).emit('newMessage', populatedUserMessage);

                // 3. Get the AI's response (this handles context and API calls)
                const aiResponse = await aiChatService.getAiResponse(sessionId, userId, text);

                // 4. The aiChatService now saves the AI message, so we just need to broadcast it.
                // The aiResponse object is already populated.
                io.to(sessionId).emit('newMessage', aiResponse);
                logger.info(`AI response sent to session ${sessionId}`);

            } catch (error) {
                logger.error(`Error in sendAiMessage event: ${error.message}`);
                const errorMessage = {
                    chatSession: sessionId,
                    type: 'system',
                    text: "I'm sorry, I encountered an error while processing your request. Please try again.",
                    createdAt: new Date(),
                };
                socket.emit('newMessage', errorMessage);
            }
        });

        // --- Handle Disconnection ---
        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};


module.exports = {
    initSocket
};
