const Message = require('../models/Message');
const logger = require('../utils/logger');

const USER_MESSAGE_LIMIT = 50;

const pruneOldMessages = async (chatSessionId) => {
  try {
    const userMessageCount = await Message.countDocuments({
      chatSession: chatSessionId,
      type: 'user'
    });

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
    .select('_id');

    if (oldestUserMessages.length > 0) {
      const userMessageIdsToDelete = oldestUserMessages.map(msg => msg._id);

      const aiRepliesToDelete = await Message.find({
        chatSession: chatSessionId,
        type: 'ai',
        inReplyTo: { $in: userMessageIdsToDelete }
      }).select('_id');

      const aiReplyIdsToDelete = aiRepliesToDelete.map(msg => msg._id);

      const allIdsToDelete = [...userMessageIdsToDelete, ...aiReplyIdsToDelete];
      
      const result = await Message.deleteMany({ _id: { $in: allIdsToDelete } });
      
      logger.info(`Pruned ${result.deletedCount} old message(s) (users and their AI replies) from session ${chatSessionId}.`);
    }
  } catch (error) {
    logger.error('Error during message cleanup:', {
      sessionId: chatSessionId,
      error: error.message
    });
  }
};

module.exports = { pruneOldMessages };