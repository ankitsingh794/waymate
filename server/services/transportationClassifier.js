const mlModelService = require('./ml_model_service');

/**
 * Converts raw tracking points into the feature format expected by the ML API
 * @param {Array} tripPoints - Array of raw tracking data points
 * @returns {Object} Aggregated features for ML prediction
 */
const extractMLFeatures = (tripPoints) => {
    if (!tripPoints || tripPoints.length < 2) {
        return null;
    }

    // Filter out points with sensor data
    const sensorPoints = tripPoints.filter(p => 
        p.accelerometerX != null && p.accelerometerY != null && p.accelerometerZ != null &&
        p.gyroscopeX != null && p.gyroscopeY != null && p.gyroscopeZ != null
    );

    if (sensorPoints.length < 2) {
        console.warn('Insufficient sensor data for ML classification');
        return null;
    }

    // Calculate trip duration in seconds
    const startTime = new Date(tripPoints[0].timestamp);
    const endTime = new Date(tripPoints[tripPoints.length - 1].timestamp);
    const durationSeconds = (endTime - startTime) / 1000;

    // Calculate accelerometer magnitude for each point
    const accelerometerMagnitudes = sensorPoints.map(p => 
        Math.sqrt(p.accelerometerX * p.accelerometerX + 
                 p.accelerometerY * p.accelerometerY + 
                 p.accelerometerZ * p.accelerometerZ)
    );

    // Calculate gyroscope magnitude for each point
    const gyroscopeMagnitudes = sensorPoints.map(p => 
        Math.sqrt(p.gyroscopeX * p.gyroscopeX + 
                 p.gyroscopeY * p.gyroscopeY + 
                 p.gyroscopeZ * p.gyroscopeZ)
    );

    // Extract sound data (if available)
    const soundValues = sensorPoints
        .filter(p => p.soundDb != null)
        .map(p => p.soundDb);

    // Calculate statistics
    const calculateStats = (values) => {
        if (values.length === 0) return { mean: 0, min: 0, max: 0, std: 0 };
        
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
        const std = Math.sqrt(variance);
        
        return { mean, min, max, std };
    };

    const accelStats = calculateStats(accelerometerMagnitudes);
    const gyroStats = calculateStats(gyroscopeMagnitudes);
    const soundStats = soundValues.length > 0 ? calculateStats(soundValues) : { mean: 0, min: 0, max: 0, std: 0 };

    // Return in the format expected by your ML service
    return {
        "time": durationSeconds,
        "android.sensor.accelerometer#mean": accelStats.mean,
        "android.sensor.accelerometer#min": accelStats.min,
        "android.sensor.accelerometer#max": accelStats.max,
        "android.sensor.accelerometer#std": accelStats.std,
        "android.sensor.gyroscope#mean": gyroStats.mean,
        "android.sensor.gyroscope#min": gyroStats.min,
        "android.sensor.gyroscope#max": gyroStats.max,
        "android.sensor.gyroscope#std": gyroStats.std,
        "sound#mean": soundStats.mean,
        "sound#min": soundStats.min,
        "sound#max": soundStats.max,
        "sound#std": soundStats.std
    };
};

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
    // First try to extract ML features in the format your backend expects
    const mlFeatures = extractMLFeatures(tripPoints);
    
    if (mlFeatures) {
        console.log('Using ML model with aggregated sensor features...');
        console.log('ML Features:', JSON.stringify(mlFeatures, null, 2));
        
        const mlPrediction = await mlModelService.predictMode(mlFeatures);
        
        // Ensure we have both accuracy and confidence fields
        const result = {
            mode: mlPrediction.mode || 'unknown',
            accuracy: mlPrediction.accuracy || mlPrediction.confidence || 0.0,
            confidence: mlPrediction.confidence || mlPrediction.accuracy || 0.0
        };

        console.log(`ML Classification result: mode=${result.mode}, accuracy=${result.accuracy}`);
        return result;
    }

    // Fallback to rule-based classification if sensor data is insufficient
    console.log('Insufficient sensor data, falling back to speed-based classification...');
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

    // If no clear pattern, return unknown with low confidence
    return { mode: 'unknown', accuracy: 0.3, confidence: 0.3 };
};

const triggerRetraining = (trip, correctedMode) => {
     mlModelService.retrainModelWithCorrection(trip, correctedMode)
        .catch(err => console.error("Failed to trigger model retraining:", err));
}

module.exports = { classifyTrip, triggerRetraining };

