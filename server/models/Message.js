const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chatSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatSession',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function () {
        return this.type === 'user';
      }
    },
    text: { type: String, trim: true },

    type: {
      type: String,
      enum: ['user', 'system', 'ai'],
      default: 'user'
    },
    inReplyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },

    media: {
      url: String,
      type: {
        type: String,
        enum: ['image', 'file', 'video'],
        default: null
      }
    },

    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent'
    },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    }
  },
  { timestamps: true } // Adds createdAt & updatedAt
);

// ✅ Index for fast chat queries
messageSchema.index({ chatSession: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
