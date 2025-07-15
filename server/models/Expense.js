const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  description: String,
  date: { type: Date, default: Date.now },
  category: String
});

module.exports = mongoose.model('Expense', expenseSchema);