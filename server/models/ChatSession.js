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
      ref: 'Trip',
      required: function() { return this.sessionType === 'group'; }
    },
    name: {
        type: String,
        default: 'Trip Chat'
    },
    lastMessage: {
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: String,
      sentAt: Date
    }
  },
  { timestamps: true }
);

chatSessionSchema.index({ participants: 1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
