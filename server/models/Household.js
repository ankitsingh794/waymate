const mongoose = require('mongoose');

const householdSchema = new mongoose.Schema({
    householdName: {
        type: String,
        required: [true, 'Please provide a name for the household.'],
        trim: true,
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
        }
    }],
    inviteTokens: [{
        token: { type: String, required: true },
        expires: { type: Date, required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }]
}, { timestamps: true });

householdSchema.index({ 'members.userId': 1 });

module.exports = mongoose.model('Household', householdSchema);