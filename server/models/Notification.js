const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['alert', 'trip', 'group', 'system'],
      default: 'system'
    },
    link: { type: String }, // Optional action link
    
    // The tripId should be used for all trip and group related notifications
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
    
    // REFERENCE FIX: Removed the 'groupId' field as there is no 'Group' model.
    // groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal'
    },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
