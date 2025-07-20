const mongoose = require('mongoose');

const offlineCacheSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Type of cached data
    type: {
      type: String,
      enum: ['ai_response', 'itinerary', 'destination', 'weather', 'general'],
      default: 'general'
    },

    // Optional Redis reference key
    redisKey: { type: String },

    // Cached content (AI response, trip data, etc.)
    data: {
      type: Object,
      required: true
    },

    // TTL for cache
    expiresAt: { type: Date }
  },
  { timestamps: true } // Adds createdAt & updatedAt
);

// ✅ TTL index for auto-expiry
offlineCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
offlineCacheSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('OfflineCache', offlineCacheSchema);
