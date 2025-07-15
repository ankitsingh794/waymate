const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
  },
  images: [String],
  createdAt: { type: Date, default: Date.now }
});

destinationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Destination', destinationSchema);