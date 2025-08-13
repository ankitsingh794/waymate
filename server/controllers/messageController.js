const mongoose = require('mongoose');
const Message = require('../models/Message');
const ChatSession = require('../models/ChatSession');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const logger = require('../utils/logger');
const cloudinary = require('../config/cloudinary');
const { getSocketIO } = require('../utils/socket');

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

exports.sendMediaMessage = async (req, res) => {
    const { sessionId } = req.params;
    const senderId = req.user._id;
    
    if (!req.file) {
        return sendError(res, 400, false, 'No media file provided.');
    }

    let uploadResult = null;
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        const chatSession = await ChatSession.findOne({ _id: sessionId, participants: senderId });
        if (!chatSession) {
            throw { statusCode: 403, message: 'Access denied. You cannot send messages to this session.' };
        }

        // 1. Upload file to Cloudinary
        uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { resource_type: 'auto', folder: `chat_media/${sessionId}` },
                (error, result) => {
                    if (error) reject(error);
                    resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        if (!uploadResult) {
            throw new Error('Cloudinary upload failed.');
        }

        let mediaType = 'file';
        if (req.file.mimetype.startsWith('image/')) mediaType = 'image';
        else if (req.file.mimetype.startsWith('video/')) mediaType = 'video';

        // 2. Create message and update session within a transaction
        const newMessage = new Message({
            chatSession: sessionId,
            sender: senderId,
            messageType: 'media',
            media: {
                url: uploadResult.secure_url,
                type: mediaType,
                publicId: uploadResult.public_id,
            },
            status: 'sent',
        });
        await newMessage.save({ session: dbSession });

        chatSession.lastMessage = {
            text: `${req.user.username} sent a ${mediaType}.`,
            sentAt: new Date(),
        };
        await chatSession.save({ session: dbSession });

        // 3. If all DB operations succeed, commit the transaction
        await dbSession.commitTransaction();
        
        // 4. Populate and emit the message
        const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'username email profile.avatar');
        const io = getSocketIO();
        io.to(sessionId).emit('newMessage', populatedMessage);

        logger.info(`Media message sent by ${senderId} in session ${sessionId}`);
        sendSuccess(res, 201, true, 'Media message sent successfully', { message: populatedMessage });

    } catch (error) {
        // If any part of the process fails, abort the DB transaction
        await dbSession.abortTransaction();

        // FIX: If a file was uploaded but the transaction failed, delete it from Cloudinary.
        if (uploadResult && uploadResult.public_id) {
            try {
                await cloudinary.uploader.destroy(uploadResult.public_id);
                logger.warn(`Cleaned up orphaned Cloudinary file due to transaction failure: ${uploadResult.public_id}`);
            } catch (cleanupError) {
                logger.error(`CRITICAL: Failed to clean up orphaned Cloudinary file: ${cleanupError.message}`);
            }
        }

        logger.error(`Error sending media message: ${error.message}`);
        sendError(res, error.statusCode || 500, false, error.message || 'Failed to send media message.');
    } finally {
        dbSession.endSession();
    }
};