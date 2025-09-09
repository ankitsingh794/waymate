/**
 * @file models/Household.js
 * @description Mongoose model for a Household. This has been updated to include
 * member relationships, socio-economic survey data, and a stable anonymized ID for research.
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Sub-schema for socio-economic data collection, crucial for research purposes.
const surveyDataSchema = new mongoose.Schema({
    vehicleOwnership: {
        type: Number,
        min: 0,
        default: 0
    },
    householdSize: {
        type: Number,
        min: 1
    },
    incomeRange: {
        type: String,
        enum: ['<25k', '25k-50k', '50k-100k', '100k-200k', '>200k', 'prefer_not_to_say'],
    },
    lastUpdated: {
        type: Date
    }
}, { _id: false });

const householdSchema = new mongoose.Schema({
    householdName: {
        type: String,
        required: [true, 'Please provide a name for the household.'],
        trim: true,
    },
    // Stable, anonymized ID for longitudinal research analysis. Protects user privacy.
    anonymizedId: {
        type: String,
        default: () => uuidv4(),
        unique: true,
        required: true,
        index: true
    },
    members: [{
        _id: false,
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['head', 'member'],
            default: 'member',
            required: true
        },
        relationship: {
            type: String,
            enum: ['parent', 'child', 'spouse', 'roommate', 'partner', 'relative', 'other'],
            default: 'other',
            trim: true
        }
    }],
    surveyData: surveyDataSchema,
    inviteTokens: [{
        _id: false,
        token: { type: String, required: true },
        expires: { type: Date, required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }]
}, { timestamps: true });

householdSchema.index({ 'members.userId': 1 });
householdSchema.index({ 'inviteTokens.token': 1 });

module.exports = mongoose.model('Household', householdSchema);
