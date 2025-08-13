const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email']
    },
    message: { type: String, required: true },
    reply: { type: String },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['app_support', 'trip_feedback'],
      default: 'app_support'
    },
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
      max: 5
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved'],
      default: 'pending'
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    },
    attachments: [
      {
        url: String,
        fileType: String
      }
    ]
  },
  { timestamps: true }
);


feedbackSchema.index({ status: 1, type: 1, sentiment: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);