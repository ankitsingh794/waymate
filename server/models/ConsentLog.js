const mongoose = require('mongoose');

const consentLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    consentType: {
        type: String,
        enum: ['data_collection', 'demographic_data', 'passive_tracking'],
        required: true,
    },
    status: {
        type: String,
        enum: ['granted', 'revoked'],
        required: true,
    },
    grantedAt: {
        type: Date,
        default: Date.now,
    },
    source: { 
        type: String,
        default: 'web_initial_signup',
    }
}, { timestamps: true });

consentLogSchema.index({ userId: 1, consentType: 1 });

module.exports = mongoose.model('ConsentLog', consentLogSchema);