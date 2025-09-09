const mongoose = require('mongoose');
const Message = require('../models/Message');
const ChatSession = require('../models/ChatSession');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const logger = require('../utils/logger');
const cloudinary = require('../config/cloudinary');
const { getSocketIO } = require('../utils/socket');
const AppError = require('../utils/AppError');

exports.getMessages = async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user._id;
    const { page = 1, limit = 30 } = req.query;

    try {
        const session = await ChatSession.findOne({ _id: sessionId, participants: userId });
        if (!session) {
            return sendError(res, 403, 'Access denied. You are not a participant of this chat session.');
        }

        const messages = await Message.find({ chatSession: sessionId })
            .populate('sender', 'name email profileImage')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const totalMessages = await Message.countDocuments({ chatSession: sessionId });

        sendSuccess(res, 200, 'Messages fetched successfully', {
            messages: messages.reverse(),
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalMessages / limit),
            totalMessages,
        });
    } catch (error) {
        logger.error(`Error fetching messages: ${error.message}`);
        sendError(res, 500, 'Failed to fetch messages.');
    }
};


// Add this new function to your controllers/messageController.js file

exports.sendTextMessage = async (req, res, next) => {
    const { sessionId } = req.params;
    const { message: messageText } = req.body;
    const senderId = req.user._id;

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        const chatSession = await ChatSession.findOne({ _id: sessionId, participants: senderId }).session(dbSession);
        if (!chatSession) {
            throw new AppError('Access denied. You cannot send messages to this session.', 403);
        }

        const newMessage = new Message({
            chatSession: sessionId,
            sender: senderId,
            messageType: 'text',
            text: messageText,
        });
        await newMessage.save({ session: dbSession });

        chatSession.lastMessage = {
            text: messageText,
            sentAt: new Date(),
        };
        await chatSession.save({ session: dbSession });

        await dbSession.commitTransaction();

        // Populate sender details for the socket event and response
        const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name email profileImage');
        
        // Emit event to other clients in the room
        const io = getSocketIO();
        io.to(sessionId).emit('newMessage', populatedMessage);

        logger.info(`Text message sent by ${senderId} in session ${sessionId}`);
        sendSuccess(res, 201, 'Message sent successfully.', { message: populatedMessage });

    } catch (error) {
        await dbSession.abortTransaction();
        next(error); // Pass error to the global error handler
    } finally {
        dbSession.endSession();
    }
};


exports.sendMediaMessage = async (req, res, next) => {
    console.log('req.file:', req.file);
    console.log('req.body:', req.body);
    const { sessionId } = req.params;
    const senderId = req.user._id;

    if (!req.file) {
        return next(new AppError('No media file was provided for upload.', 400));
    }

    let uploadResult = null;
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        const chatSession = await ChatSession.findOne({ _id: sessionId, participants: senderId });
        if (!chatSession) {
            throw new AppError('Access denied. You cannot send messages to this session.', 403);
        }

        uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { resource_type: 'auto', folder: `chat_media/${sessionId}` },
                (error, result) => {
                    if (error) return reject(new AppError('Cloudinary upload failed.', 500));
                    resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : (req.file.mimetype.startsWith('video/') ? 'video' : 'file');

        const newMessage = new Message({
            chatSession: sessionId,
            sender: senderId,
            messageType: 'media',
            media: {
                url: uploadResult.secure_url,
                type: mediaType,
                publicId: uploadResult.public_id,
            },
        });
        await newMessage.save({ session: dbSession });

        chatSession.lastMessage = {
            text: `${req.user.name} sent a ${mediaType}.`,
            sentAt: new Date(),
        };
        await chatSession.save({ session: dbSession });

        await dbSession.commitTransaction();

        const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name email profileImage');
        const io = getSocketIO();
        io.to(sessionId).emit('newMessage', populatedMessage);

        logger.info(`Media message sent by ${senderId} in session ${sessionId}`);
        sendSuccess(res, 201, 'Media message sent successfully.', { message: populatedMessage });

    } catch (error) {
        await dbSession.abortTransaction();

        if (uploadResult?.public_id) {
            try {
                await cloudinary.uploader.destroy(uploadResult.public_id);
                logger.warn(`Cleaned up orphaned Cloudinary file: ${uploadResult.public_id}`);
            } catch (cleanupError) {
                logger.error(`CRITICAL: Failed to clean up orphaned Cloudinary file: ${cleanupError.message}`);
            }
        }

        next(error);
    } finally {
        dbSession.endSession();
    }
};
