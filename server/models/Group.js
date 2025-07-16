const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },

  // Admin of the group
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Members with roles
  members: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      role: { type: String, enum: ['admin', 'member'], default: 'member' },
      joinedAt: { type: Date, default: Date.now }
    }
  ],

  // Optional: Associated trip for group travel
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },

  settings: {
    allowInvite: { type: Boolean, default: true },
    chatEnabled: { type: Boolean, default: true }
  },

  createdAt: { type: Date, default: Date.now }
});

// Index for quick queries
groupSchema.index({ createdBy: 1 });
groupSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Group', groupSchema);
