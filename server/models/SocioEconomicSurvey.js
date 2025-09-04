const mongoose = require('mongoose');

const socioEconomicSurveySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, 
        index: true,
    },
    householdIncome: {
        type: String,
        enum: ['<25k', '25k-50k', '50k-100k', '100k-200k', '>200k', 'prefer_not_to_say'],
    },
    vehicleCount: {
        type: Number,
        min: 0,
    },
    primaryTransportModeToWork: {
        type: String,
        enum: ['private_car', 'private_bike', 'public_transport', 'walk_cycle', 'work_from_home', 'other'],
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

socioEconomicSurveySchema.index({ updatedAt: 1 });

module.exports = mongoose.model('SocioEconomicSurvey', socioEconomicSurveySchema);