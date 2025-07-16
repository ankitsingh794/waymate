const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['alert', 'trip', 'group', 'system'],
    default: 'system'
  },
  link: { type: String }, // optional link to action
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Index for performance
notificationSchema.index({ user: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
