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
      minlength: 8,
      select: false
    },
    passwordChangedAt: Date,
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator','researcher'],
      default: 'user'
    },
    accountStatus: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'banned'],
      default: 'pending'
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    profileImage: {
      type: String,
      default: ''
    },
    preferences: {
      language: { type: String, default: 'en' },
      currency: { type: String, default: 'INR' }
    },
    location: {
      city: String,
      country: String,
      point: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
        },
      },
    },
    favoriteTrips: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip'
    }],
     householdId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Household',
        default: null
    },
    
    passwordResetToken: String,
    passwordResetTokenExpires: Date,
    emailVerificationToken: String,
    emailVerificationTokenExpires: Date,
    sessionHash: {
        type: String,
        select: false
    },
    // ADD: Consents field to sync with ConsentLog
    consents: {
      data_collection: {
        status: { type: String, enum: ['granted', 'revoked'], default: 'revoked' },
        updatedAt: { type: Date, default: Date.now }
      },
      demographic_data: {
        status: { type: String, enum: ['granted', 'revoked'], default: 'revoked' },
        updatedAt: { type: Date, default: Date.now }
      },
      passive_tracking: {
        status: { type: String, enum: ['granted', 'revoked'], default: 'revoked' },
        updatedAt: { type: Date, default: Date.now }
      }
    },
  },
  { timestamps: true }
);

// --- Hooks and Methods (No changes needed here) ---

userSchema.index({ 'location.point': '2dsphere' });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  // This hook now correctly checks for passwordChangedAt at the top level
  if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000;
  }
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.createEmailVerifyToken = function () {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  this.emailVerificationTokenExpires = Date.now() + 15 * 60 * 1000; // 15 mins
  return verificationToken;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetTokenExpires = Date.now() + 15 * 60 * 1000; // 15 mins
  return resetToken;
};

// ADD: Method to sync consents from ConsentLog
userSchema.methods.syncConsentsFromLog = async function() {
  const ConsentLog = require('./ConsentLog');
  
  const consentTypes = ['data_collection', 'demographic_data', 'passive_tracking'];
  
  for (const consentType of consentTypes) {
    const latestConsent = await ConsentLog.findOne({
      userId: this._id,
      consentType: consentType
    }).sort({ createdAt: -1 });

    if (latestConsent) {
      this.consents[consentType] = {
        status: latestConsent.status,
        updatedAt: latestConsent.createdAt
      };
    }
  }
  
  await this.save();
  return this;
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);