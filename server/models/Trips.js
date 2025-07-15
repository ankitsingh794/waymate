const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tripName: {
    type: String,
    required: [true, 'Please add a trip name'],
    trim: true
  },
  destination: {
    type: String,
    required: [true, 'Please add a destination'],
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function() {
        return this.endDate >= this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  travelers: {
    type: Number,
    default: 1,
    min: 1
  },
  budget: {
    type: Number,
    default: 0
  },
  preferences: {
    transportMode: { type: String, enum: ['car', 'train', 'flight', 'bus', 'bike'], default: 'car' },
    accommodationType: { type: String, enum: ['hotel', 'hostel', 'homestay', 'resort'], default: 'hotel' },
    activities: [String]
  },
  route: [
    {
      location: String,
      lat: Number,
      lng: Number,
      day: Number
    }
  ],
  status: {
    type: String,
    enum: ['planned', 'ongoing', 'completed', 'canceled'],
    default: 'planned'
  },
  weatherData: {
    type: Object
  },
  alerts: [String],
  coverImage: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Index for performance
tripSchema.index({ userId: 1, startDate: 1 });

module.exports = mongoose.model('Trip', tripSchema);
