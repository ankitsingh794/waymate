const mongoose = require('mongoose');

const toCents = (val) => Math.round(val * 100);
const fromCents = (val) => val / 100;

const expenseParticipantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  share: {
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
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);


ExpenseSchema.pre('save', function(next) {
    const totalShare = Math.round(this.participants.reduce((sum, p) => sum + fromCents(p.share), 0) * 100);
    
    if (totalShare !== this.amount) {
        const err = new Error('The sum of participant shares must equal the total expense amount.');
        return next(err);
    }
    next();
});

module.exports = mongoose.model('Expense', ExpenseSchema);
