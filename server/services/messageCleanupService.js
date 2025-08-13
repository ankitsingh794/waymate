const mongoose = require('mongoose');
const Message = require('../models/Message');
const logger = require('../utils/logger');

const USER_MESSAGE_LIMIT = parseInt(process.env.USER_MESSAGE_LIMIT, 10) || 50;

const pruneOldMessages = async (chatSessionId) => {
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const userMessageCount = await Message.countDocuments({
                chatSession: chatSessionId,
                type: 'user'
            }).session(session);

            if (userMessageCount <= USER_MESSAGE_LIMIT) {
                return; 
            }

            const messagesToDeleteCount = userMessageCount - USER_MESSAGE_LIMIT;

            const oldestUserMessages = await Message.find({
                chatSession: chatSessionId,
                type: 'user'
            })
            .sort({ createdAt: 1 })
            .limit(messagesToDeleteCount)
            .select('_id')
            .session(session);

            if (oldestUserMessages.length === 0) {
                return;
            }
            
            const userMessageIdsToDelete = oldestUserMessages.map(msg => msg._id);

            const aiRepliesToDelete = await Message.find({
                chatSession: chatSessionId,
                type: 'ai',
                inReplyTo: { $in: userMessageIdsToDelete }
            }).select('_id').session(session);

            const allIdsToDelete = [
                ...userMessageIdsToDelete,
                ...aiRepliesToDelete.map(msg => msg._id)
            ];

            const result = await Message.deleteMany(
                { _id: { $in: allIdsToDelete } },
                { session }
            );

            if (result.deletedCount > 0) {
                logger.info(`Pruned ${result.deletedCount} old message(s) from session ${chatSessionId} within a transaction.`);
            }
        });
    } catch (error) {
        logger.error('Error during message cleanup transaction:', {
            sessionId: chatSessionId,
            error: error.message,
            stack: error.stack
        });
    } finally {
        await session.endSession();
    }
};

module.exports = { pruneOldMessages };