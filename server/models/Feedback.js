const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Optional: For logged-in users
      required: false
    },
    name: { type: String, required: true }, // For guests
    email: { type: String, required: true }, // For reply
    message: { type: String, required: true }, // Feedback message
    reply: { type: String }, // Admin response

    // Feedback type: app-related or trip-specific
    type: {
      type: String,
      enum: ['app_support', 'trip_feedback'],
      default: 'app_support'
    },

    // Required if it's trip-related feedback
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: function () {
        return this.type === 'trip_feedback';
      }
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: false // Optional: For trip feedback
    },

    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved'],
      default: 'pending'
    }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

const Feedback = mongoose.model('Feedback', feedbackSchema);
module.exports = Feedback;
