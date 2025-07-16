const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  sentAt: { type: Date, default: Date.now }
});

const chatSessionSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  type: { type: String, enum: ['private', 'group'], default: 'private' },
  messages: [messageSchema],
  lastMessage: {
    text: String,
    sentAt: Date
  },
  createdAt: { type: Date, default: Date.now }
});

chatSessionSchema.index({ participants: 1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
