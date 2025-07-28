const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
  query: { type: String, required: true, index: true },
  
  city: { type: String, required: true, index: true },

  name: { type: String, required: true },
  address: { type: String },
  rating: { type: Number },
  reason: { type: String }, 

  photo_reference: { type: String },
  place_id: { type: String },
  imageUrl: { type: String },

  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
    }
  },
  lastFetched: { type: Date, default: Date.now }
}, { timestamps: true });

placeSchema.index({ query: 1, city: 1 });
placeSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Place', placeSchema);