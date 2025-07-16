const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['weather', 'event', 'safety', 'news'],
    required: true
  },
  title: { type: String, required: true },
  description: { type: String },
  source: { type: String, required: true }, // e.g., 'RSS', 'Twitter'
  
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  
  link: { type: String }, // original alert link
  postedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }, // optional, for auto-deletion
}, { timestamps: true });

// Geospatial index for nearby alerts
alertSchema.index({ location: '2dsphere' });

// TTL index if expiresAt is provided
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Alert', alertSchema);
