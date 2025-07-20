const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  
  chatSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatSession',
    required: true
  },

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

  // Pending invitations
  invites: [
    {
      email: { type: String, required: true },
      invitedAt: { type: Date, default: Date.now },
      status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' }
    }
  ],

  // Associated trip for group travel
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },

  settings: {
    allowInvite: { type: Boolean, default: true },
    chatEnabled: { type: Boolean, default: true }
  },

  aiContext: {
    lastPrompt: { type: String }, // For AI continuity in group planning
    lastResponse: { type: String }
  },

  activityLog: [
    {
      action: String, // e.g., "added member", "updated itinerary"
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      timestamp: { type: Date, default: Date.now }
    }
  ],

  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },

  createdAt: { type: Date, default: Date.now }
});

// Index for quick queries
groupSchema.index({ createdBy: 1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ status: 1 });

module.exports = mongoose.model('Group', groupSchema);