const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  city: { type: String, trim: true },
  country: { type: String, trim: true },
  category: {
    type: String,
    enum: ['attraction', 'hotel', 'restaurant', 'activity'],
    default: 'attraction'
  },
  images: [String],
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Geospatial index for queries like "nearby attractions"
destinationSchema.index({ location: '2dsphere' });
// Additional indexes for better performance
destinationSchema.index({ name: 1 });
destinationSchema.index({ category: 1 });

module.exports = mongoose.model('Destination', destinationSchema);
