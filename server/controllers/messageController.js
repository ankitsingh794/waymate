const Message = require('../models/Message');
const ChatSession = require('../models/ChatSession');
const { sendResponse } = require('../utils/responseHelper');
const logger = require('../utils/logger');
const cloudinary = require('../config/cloudinary');
const { getSocketIO } = require('../utils/socket');

/**
 * @desc    Get message history for a chat session with pagination
 * @route   GET /api/messages/session/:sessionId
 * @access  Private (for participants)
 */
exports.getMessages = async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query; // Default to 20 messages per page

    try {
        // 1. Verify the user is a participant of the chat session
        const session = await ChatSession.findOne({ _id: sessionId, participants: userId });
        if (!session) {
            return sendResponse(res, 403, false, 'Access denied. You are not a participant of this chat session.');
        }

        // 2. Fetch messages with pagination
        const messages = await Message.find({ chatSession: sessionId })
            .populate('sender', 'username email profile.avatar') // Get sender details
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // 3. Get total message count for pagination metadata
        const totalMessages = await Message.countDocuments({ chatSession: sessionId });

        sendResponse(res, 200, true, 'Messages fetched successfully', {
            messages: messages.reverse(), // Reverse to show oldest first in the batch
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalMessages / limit),
            totalMessages,
        });

    } catch (error) {
        logger.error(`Error fetching messages: ${error.message}`);
        sendResponse(res, 500, false, 'Failed to fetch messages.');
    }
};

/**
 * @desc    Send a media message (image, file)
 * @route   POST /api/messages/session/:sessionId/media
 * @access  Private (for participants)
 */
exports.sendMediaMessage = async (req, res) => {
    const { sessionId } = req.params;
    const senderId = req.user._id;

    if (!req.file) {
        return sendResponse(res, 400, false, 'No media file provided.');
    }

    try {
        // 1. Verify the user is a participant of the chat session
        const session = await ChatSession.findOne({ _id: sessionId, participants: senderId });
        if (!session) {
            return sendResponse(res, 403, false, 'Access denied. You cannot send messages to this session.');
        }

        // 2. Upload file to Cloudinary
        // The file is available in req.file.buffer because of multer's memory storage
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { resource_type: 'auto', folder: `chat_media/${sessionId}` },
                (error, result) => {
                    if (error) reject(error);
                    resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        // 3. Determine media type based on mimetype
        let mediaType = 'file';
        if (req.file.mimetype.startsWith('image/')) {
            mediaType = 'image';
        } else if (req.file.mimetype.startsWith('video/')) {
            mediaType = 'video';
        }

        // 4. Create and save the new message document
        const newMessage = new Message({
            chatSession: sessionId,
            sender: senderId,
            messageType: 'media',
            media: {
                url: result.secure_url,
                type: mediaType,
                publicId: result.public_id, // Store public_id for potential deletion
            },
            status: 'sent',
        });
        await newMessage.save();
        
        // 5. Populate sender details for the real-time event
        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'username email profile.avatar');

        // 6. Update the lastMessage in the chat session
        session.lastMessage = {
            text: `${req.user.username} sent a ${mediaType}.`,
            sentAt: new Date(),
        };
        await session.save();

        // 7. Emit a real-time event to all clients in the group's room
        const io = getSocketIO();
        io.to(sessionId).emit('newMessage', populatedMessage);

        logger.info(`Media message sent by ${senderId} in session ${sessionId}`);
        sendResponse(res, 201, true, 'Media message sent successfully', { message: populatedMessage });

    } catch (error) {
        logger.error(`Error sending media message: ${error.message}`);
        sendResponse(res, 500, false, 'Failed to send media message.');
    }
};
