const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/\S+@\S+\.\S+/, 'Please provide a valid email']
  },
  otp: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, { timestamps: true });

// TTL index for auto-deletion after expiration
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Hash OTP before saving
otpSchema.pre('save', async function(next) {
  if (!this.isModified('otp')) return next();
  const salt = await bcrypt.genSalt(10);
  this.otp = await bcrypt.hash(this.otp, salt);
  next();
});

// Compare OTP
otpSchema.methods.matchOtp = async function(enteredOtp) {
  return await bcrypt.compare(enteredOtp, this.otp);
};

module.exports = mongoose.model('Otp', otpSchema);
