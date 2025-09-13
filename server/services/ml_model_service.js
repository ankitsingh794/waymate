const fetch = require('node-fetch'); // Using node-fetch for robust HTTP requests in Node.js

// It's crucial to use environment variables for configuration in production.
const ML_API_BASE_URL = process.env.ML_API_BASE_URL;
const ML_API_KEY = process.env.ML_API_KEY;

/**
 * Service for interacting with the external Machine Learning API.
 */
class MLModelService {

    /**
     * Predicts the transportation mode by calling the external ML API.
     * @param {Object} features - Features like averageSpeed, speedVariance, etc.
     * @returns {Promise<Object>} A promise that resolves to a prediction object with `mode` and `accuracy`.
     */
    async predictMode(features) {
        if (!ML_API_BASE_URL) {
            console.error('ML_API_BASE_URL environment variable is not set. Cannot make predictions.');
            // Fallback to a default low-confidence prediction
            return { mode: 'unknown', accuracy: 0.1, confidence: 0.1 };
        }

        const endpoint = `${ML_API_BASE_URL}/predict`;
        console.log(`Calling external ML API at ${endpoint} with features:`, features);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ML_API_KEY}` // Using Bearer token for authentication
                },
                body: JSON.stringify({ features }),
                timeout: 5000 // 5-second timeout
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`ML API responded with status ${response.status}: ${errorBody}`);
            }

            const prediction = await response.json();
            
            // Ensure consistent response format: { "mode": "driving", "accuracy": 0.85 }
            // Handle both "accuracy" and "confidence" fields for backward compatibility
            const normalizedResponse = {
                mode: prediction.mode || 'unknown',
                accuracy: prediction.accuracy || prediction.confidence || 0.0,
                confidence: prediction.confidence || prediction.accuracy || 0.0
            };

            console.log(`ML API response: mode=${normalizedResponse.mode}, accuracy=${normalizedResponse.accuracy}`);
            return normalizedResponse;

        } catch (error) {
            console.error('Error calling ML prediction service:', error.message);
            // In case of error, return a default 'unknown' response so the app can prompt the user.
            return { mode: 'unknown', accuracy: 0.1, confidence: 0.1 };
        }
    }

    /**
     * Sends corrected trip data to the ML API's retraining endpoint.
     * @param {Object} trip - The full trip object from the database.
     * @param {String} correctedMode - The user-confirmed transportation mode.
     * @returns {Promise<void>}
     */
    async retrainModelWithCorrection(trip, correctedMode) {
         if (!ML_API_BASE_URL) {
            console.log('ML_API_BASE_URL not set. Skipping retraining feedback loop.');
            return;
        }

        const endpoint = `${ML_API_BASE_URL}/retrain`;
        console.log(`Sending data for trip ${trip.id} to ${endpoint} for retraining.`);

        try {
            const payload = {
                tripId: trip.id,
                rawDataPoints: trip.rawDataPoints, 
                correctLabel: correctedMode,
            };

            // This is a "fire-and-forget" call. We don't need to wait for the response
            // unless the ML API provides immediate feedback.
            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ML_API_KEY}`
                },
                body: JSON.stringify(payload),
            }).catch(err => {
                // We catch errors here specifically so they don't crash the main flow.
                console.error('Background call to /retrain endpoint failed:', err.message);
            });
        } catch (error) {
            console.error('Failed to prepare data for retraining:', error.message);
        }
    }
}

module.exports = new MLModelService();

