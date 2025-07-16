const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  description: { type: String, trim: true },
  date: { type: Date, default: Date.now },
  category: {
    type: String,
    enum: ['food', 'transport', 'stay', 'activity', 'misc'],
    default: 'misc'
  },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  splitType: { type: String, enum: ['equal', 'custom'], default: 'equal' }
}, { timestamps: true });

// Index for fast queries
expenseSchema.index({ trip: 1, user: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
