const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    ],

    sessionType: {
      type: String,
      enum: ['ai', 'private', 'group'],
      default: 'ai'
    },

    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip'
    },

    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },

    aiContext: {
      type: Object, // Store AI conversation history/context for continuity
      default: {}
    },

    lastMessage: {
      text: String,
      sentAt: Date
    }
  },
  { timestamps: true }
);

// ✅ Index for quick lookup
chatSessionSchema.index({ participants: 1 });
chatSessionSchema.index({ sessionType: 1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
