import 'dart:math';

// In a real app, you would use a TFLite package.
// import 'package:tflite_flutter/tflite_flutter.dart' as tfl;

enum PredictedActivity { idle, walking, driving, cycling, publicTransport }

class Prediction {
  final PredictedActivity activity;
  final double confidence;

  Prediction(this.activity, this.confidence);
}

/// A service to simulate or interact with an on-device ML model (e.g., TFLite).
/// In a real app, this service would load the model, preprocess input,
/// and run inference.
class MLService {
  // In a real implementation, you would load your TFLite model here.
  // late final tfl.Interpreter _interpreter;

  MLService() {
    // _loadModel(); // Uncomment when you have a real model
  }

  // Future<void> _loadModel() async {
  //   try {
  //     _interpreter = await tfl.Interpreter.fromAsset('assets/your_model.tflite');
  //   } catch (e) {
  //     print("Failed to load TFLite model: $e");
  //   }
  // }

  /// Predicts a user's activity from a window of sensor data features.
  /// Replace the mock implementation with your actual TFLite inference logic.
  Future<Prediction> predictActivity(Map<String, double> features) async {
    // --- MOCK IMPLEMENTATION FOR DEMONSTRATION ---
    // This logic simulates a prediction. A real implementation would run the
    // features through the TFLite interpreter.
    final random = Random();
    final speed = features['avgSpeed'] ?? 0.0;

    if (speed < 1.0) {
      return Prediction(PredictedActivity.idle, 0.95 + random.nextDouble() * 0.05);
    } else if (speed < 7.0) {
      return Prediction(PredictedActivity.walking, 0.85 + random.nextDouble() * 0.15);
    } else if (speed < 25.0) {
      return Prediction(PredictedActivity.cycling, 0.80 + random.nextDouble() * 0.20);
    } else {
      // Differentiating between driving and public transport would
      // likely require more features (e.g., from sound or magnetometer).
      return Prediction(PredictedActivity.driving, 0.90 + random.nextDouble() * 0.10);
    }
    // --- END MOCK ---

    /*
    // --- REAL TFLITE IMPLEMENTATION EXAMPLE ---
    if (_interpreter == null) return Prediction(PredictedActivity.idle, 0);

    // IMPORTANT: Ensure the input tensor is in the exact shape and order
    // your model was trained on.
    final input = [
      [
        features['avgSpeed'],
        features['maxSpeed'],
        features['speedStdDev'],
        features['speedPctl95'],
        features['accelAvgMag'],
        features['accelStdDevMag'],
        features['gyroAvgMag'],
        features['gyroStdDevMag'],
        features['avgAccuracy'],
      ]
    ];

    // Assuming the output is a list of probabilities for each class.
    // Shape might be [1, 5] for 5 classes.
    var output = List.filled(1 * 5, 0.0).reshape([1, 5]);

    _interpreter.run(input, output);

    final probabilities = output[0] as List<double>;
    final maxConfidence = probabilities.reduce(max);
    final maxIndex = probabilities.indexOf(maxConfidence);

    final predictedActivity = PredictedActivity.values[maxIndex];
    return Prediction(predictedActivity, maxConfidence);
    */
  }

  void dispose() {
    // In a real implementation, you would dispose of the TFLite interpreter.
    // _interpreter.close();
  }
}
