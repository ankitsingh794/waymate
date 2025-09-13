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
 * Classifies a trip using ML model with accuracy threshold handling.
 * @param {Array} tripPoints - The array of data points for the trip.
 * @returns {Promise<Object>} A promise that resolves to an object with `mode` and `accuracy`.
 */
const classifyTrip = async (tripPoints) => {
    const features = extractFeatures(tripPoints);
    const { averageSpeed, maxSpeed } = features;

    // Rule-based classification for obvious patterns (high confidence)
    if (averageSpeed < 7 && maxSpeed < 15) {
        return { mode: 'walking', accuracy: 0.9, confidence: 0.9 };
    }
    if (averageSpeed > 7 && averageSpeed <= 25 && maxSpeed < 35) {
        return { mode: 'cycling', accuracy: 0.8, confidence: 0.8 };
    }
    if (averageSpeed > 120 || maxSpeed > 140) {
        return { mode: 'driving', accuracy: 0.95, confidence: 0.95 };
    }

    // For complex patterns, use ML model
    console.log('Using ML model for transportation classification...');
    const mlPrediction = await mlModelService.predictMode(features);
    
    // Ensure we have both accuracy and confidence fields
    const result = {
        mode: mlPrediction.mode || 'unknown',
        accuracy: mlPrediction.accuracy || mlPrediction.confidence || 0.0,
        confidence: mlPrediction.confidence || mlPrediction.accuracy || 0.0
    };

    console.log(`Classification result: mode=${result.mode}, accuracy=${result.accuracy}`);
    return result;
};

const triggerRetraining = (trip, correctedMode) => {
     mlModelService.retrainModelWithCorrection(trip, correctedMode)
        .catch(err => console.error("Failed to trigger model retraining:", err));
}

module.exports = { classifyTrip, triggerRetraining };

