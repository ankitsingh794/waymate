const mlModelService = require('./ml_model_service');

const extractFeatures = (segment) => {
    const speeds = segment.map(p => p.speed || 0).filter(s => s > 0.5); 
    if (speeds.length < 2) return { averageSpeed: 0, speedVariance: 0, maxSpeed: 0, accelerometerSamples: 0 };
    
    const sum = speeds.reduce((a, b) => a + b, 0);
    const avgMps = sum / speeds.length;
    const variance = speeds.map(s => (s - avgMps) ** 2).reduce((a, b) => a + b, 0) / speeds.length;
    const maxMps = Math.max(...speeds);
    const accelerometerData = segment.filter(p => p.accelerometerX != null);

    return {
        averageSpeed: avgMps * 3.6, // km/h
        maxSpeed: maxMps * 3.6, // km/h
        speedVariance: variance,
        accelerometerSamples: accelerometerData.length
    };
};

/**
 * Classifies a trip. This function is now async because it calls the ML service.
 * @param {Array} tripPoints - The array of data points for the trip.
 * @returns {Promise<Object>} A promise that resolves to an object with `mode` and `confidence`.
 */
const classifyTrip = async (tripPoints) => {
    const features = extractFeatures(tripPoints);
    const { averageSpeed, maxSpeed } = features;

    if (averageSpeed < 7 && maxSpeed < 15) return { mode: 'walking', confidence: 0.9 };
    if (averageSpeed > 7 && averageSpeed <= 25 && maxSpeed < 35) return { mode: 'cycling', confidence: 0.8 };
    if (averageSpeed > 120 || maxSpeed > 140) return { mode: 'driving', confidence: 0.95 };

    const mlPrediction = await mlModelService.predictMode(features);
    
    if (mlPrediction.confidence < 0.6) {
        return { mode: 'unknown', confidence: mlPrediction.confidence };
    }
    return mlPrediction;
};

const triggerRetraining = (trip, correctedMode) => {
     mlModelService.retrainModelWithCorrection(trip, correctedMode)
        .catch(err => console.error("Failed to trigger model retraining:", err));
}

module.exports = { classifyTrip, triggerRetraining };

