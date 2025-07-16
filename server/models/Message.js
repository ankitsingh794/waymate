const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatSession',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: { type: String, required: true },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  sentAt: { type: Date, default: Date.now }
});

// Index for fast chat queries
messageSchema.index({ chatSession: 1, sentAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
