const mongoose = require('mongoose');

// Helper to convert decimal to cents
const toCents = (val) => Math.round(val * 100);
// Helper to convert cents to decimal
const fromCents = (val) => val / 100;

const expenseParticipantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  share: {
    // DATA INTEGRITY FIX: Store money as integers (cents)
    type: Number,
    required: true,
    set: toCents,
    get: fromCents
  },
}, { _id: false, toJSON: { getters: true }, toObject: { getters: true } });

const ExpenseSchema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    description: { type: String, required: [true, 'Expense description is required.'], trim: true },
    amount: {
      // DATA INTEGRITY FIX: Store money as integers (cents)
      type: Number,
      required: [true, 'Expense amount is required.'],
      set: toCents,
      get: fromCents
    },
    category: {
        type: String,
        enum: ['Food', 'Transport', 'Accommodation', 'Activities', 'Shopping', 'Other'],
        default: 'Other'
    },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [expenseParticipantSchema],
  },
  {
    timestamps: true,
    // Ensure getters are applied on JSON conversion
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

const Expense = mongoose.model('Expense', ExpenseSchema);

module.exports = Expense;
