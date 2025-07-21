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
      required: true,
      unique: true
    },
    name: {
        type: String,
        default: 'Trip Chat'
    },
    lastMessage: {
      // ENHANCEMENT: Added senderId for better UI performance
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: String,
      sentAt: Date
    }
  },
  { timestamps: true }
);

chatSessionSchema.index({ participants: 1 });
chatSessionSchema.index({ tripId: 1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
