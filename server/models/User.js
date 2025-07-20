const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please use a valid email address'],
      index: true
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator'],
      default: 'user'
    },
    accountStatus: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'banned'], // Added 'pending'
      default: 'pending' // Default to pending until email is verified
    },
    isEmailVerified: { // ✅ ADDED: Field to track verification status
      type: Boolean,
      default: false
    },
    profileImage: {
      type: String,
      default: ''
    },
    preferences: {
      language: { type: String, default: 'en' },
      currency: { type: String, default: 'USD' }
    },
    location: {
      city: String,
      country: String,
      coordinates: {
        type: [Number],
        index: '2dsphere'
      }
    },
    trips: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Trip' }],
    passwordChangedAt: Date,
    passwordResetToken: String, // ✅ RENAMED for consistency
    passwordResetTokenExpires: Date, // ✅ RENAMED for consistency
    emailVerificationToken: String, // ✅ ADDED: Field for email token
    emailVerificationTokenExpires: Date // ✅ ADDED: Field for email token expiration
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Update passwordChangedAt if password is modified
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Compare password during login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ✅ ADDED: Method to generate email verification token
userSchema.methods.createEmailVerifyToken = function () {
  const verificationToken = crypto.randomBytes(32).toString('hex');

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  this.emailVerificationTokenExpires = Date.now() + 15 * 60 * 1000; // 15 mins

  return verificationToken;
};

// ✅ RENAMED: Method to generate password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetTokenExpires = Date.now() + 15 * 60 * 1000; // 15 mins
  return resetToken;
};

// Remove sensitive data from JSON output
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);