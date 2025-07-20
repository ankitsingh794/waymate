const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['weather', 'event', 'safety', 'news'],
      required: true
    },
    title: { type: String, required: true },
    description: { type: String },

    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info'
    },

    source: { type: String, required: true }, // e.g., RSS, Twitter
    link: { type: String }, // Original alert link

    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true } // [lng, lat]
    },

    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' }, // Optional association
    language: { type: String, default: 'en' },

    postedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date } // For TTL cleanup
  },
  { timestamps: true }
);

// ✅ Geospatial index for nearby alerts
alertSchema.index({ location: '2dsphere' });

// ✅ TTL index for auto-expiration
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Alert', alertSchema);
