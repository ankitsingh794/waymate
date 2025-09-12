// lib/services/ml_service.dart

import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:mobile/services/sensor_service.dart';
import 'package:mobile/services/tracking_service.dart';
import 'package:rxdart/rxdart.dart';

enum ActivityType { still, walking, cycling, driving, unknown }

class PredictedActivity {
  final ActivityType type;
  final double confidence;
  final DateTime timestamp;
  final Map<String, dynamic> metadata;

  PredictedActivity({
    required this.type,
    required this.confidence,
    DateTime? timestamp,
    this.metadata = const {},
  }) : timestamp = timestamp ?? DateTime.now();

  @override
  String toString() =>
      'PredictedActivity(type: $type, confidence: ${confidence.toStringAsFixed(2)})';
}

class ActivityFeatures {
  final double avgSpeed;
  final double maxSpeed;
  final double minSpeed;
  final double speedVariance;
  final double avgAcceleration;
  final double maxAcceleration;
  final double accelerationVariance;
  final double distanceTraveled;
  final double bearing;
  final double bearingVariance;
  final int dataPoints;
  final Duration windowDuration;

  ActivityFeatures({
    required this.avgSpeed,
    required this.maxSpeed,
    required this.minSpeed,
    required this.speedVariance,
    required this.avgAcceleration,
    required this.maxAcceleration,
    required this.accelerationVariance,
    required this.distanceTraveled,
    required this.bearing,
    required this.bearingVariance,
    required this.dataPoints,
    required this.windowDuration,
  });

  Map<String, dynamic> toMap() => {
        'avgSpeed': avgSpeed,
        'maxSpeed': maxSpeed,
        'minSpeed': minSpeed,
        'speedVariance': speedVariance,
        'avgAcceleration': avgAcceleration,
        'maxAcceleration': maxAcceleration,
        'accelerationVariance': accelerationVariance,
        'distanceTraveled': distanceTraveled,
        'bearing': bearing,
        'bearingVariance': bearingVariance,
        'dataPoints': dataPoints,
        'windowDurationSeconds': windowDuration.inSeconds,
      };
}

class MLService {
  static const int _windowSizeSeconds = 15;
  static const int _minDataPointsRequired = 3;
  static const double _confidenceThreshold = 0.6;

  final SensorService _sensorService = SensorService();
  final _activityController = StreamController<PredictedActivity>.broadcast();
  final List<PredictedActivity> _recentPredictions = [];
  static const int _maxHistorySize = 5;

  // --- CORRECTED: This map is now actively used by the classifier ---
  static const Map<ActivityType, Map<String, double>> _activityThresholds = {
    ActivityType.still: {
      'maxAvgSpeed': 2.0,
      'maxAcceleration': 1.5,
    },
    ActivityType.walking: {
      'minAvgSpeed': 1.0,
      'maxAvgSpeed': 8.0,
      'maxAcceleration': 4.0,
      'maxSpeedVariance': 3.0,
    },
    ActivityType.cycling: {
      'minAvgSpeed': 8.0,
      'maxAvgSpeed': 35.0,
      'maxAcceleration': 6.0,
    },
    ActivityType.driving: {
      'minAvgSpeed': 15.0,
      'minMaxAcceleration': 2.0,
    },
  };

  Stream<PredictedActivity> get predictedActivityStream =>
      _activityController.stream;

  MLService() {
    _initPredictionPipeline();
  }

  void _initPredictionPipeline() {
    _sensorService.trackingPointStream
        .bufferTime(const Duration(seconds: _windowSizeSeconds))
        .where((window) => window.isNotEmpty)
        .listen(
      _processWindow,
      onError: (error) {
        debugPrint('ML Pipeline Error: $error');
        _activityController.add(PredictedActivity(
          type: ActivityType.unknown,
          confidence: 0.0,
          metadata: {'error': error.toString()},
        ));
      },
    );
  }

  void _processWindow(List<TrackingPoint> window) {
    try {
      if (window.length < _minDataPointsRequired) {
        debugPrint('Insufficient data points: ${window.length}');
        return;
      }

      // Extract comprehensive features
      final features = _extractAdvancedFeatures(window);

      // Predict activity using multiple models
      final prediction = _predictActivityWithEnsemble(features);

      // Apply temporal smoothing
      final smoothedPrediction = _applTemporalSmoothing(prediction);

      // Add to history and stream
      _addToHistory(smoothedPrediction);
      _activityController.add(smoothedPrediction);
    } catch (e) {
      debugPrint('Error processing ML window: $e');
      _activityController.add(PredictedActivity(
        type: ActivityType.unknown,
        confidence: 0.0,
        metadata: {'processing_error': e.toString()},
      ));
    }
  }

  ActivityFeatures _extractAdvancedFeatures(List<TrackingPoint> window) {
    if (window.isEmpty) {
      throw ArgumentError('Window cannot be empty');
    }

    // Speed calculations
    final speeds = window.map((p) => p.speed).where((s) => s >= 0).toList();
    final avgSpeed =
        speeds.isEmpty ? 0.0 : speeds.reduce((a, b) => a + b) / speeds.length;
    final maxSpeed = speeds.isEmpty ? 0.0 : speeds.reduce(max);
    final minSpeed = speeds.isEmpty ? 0.0 : speeds.reduce(min);

    // Speed variance
    final speedVariance =
        speeds.isEmpty ? 0.0 : _calculateVariance(speeds, avgSpeed);

    // Acceleration calculations
    final accelerations = <double>[];
    for (int i = 1; i < window.length; i++) {
      final timeDiff = window[i]
              .timestamp
              .difference(window[i - 1].timestamp)
              .inMilliseconds /
          1000.0;
      if (timeDiff > 0) {
        final accel = (window[i].speed - window[i - 1].speed) / timeDiff;
        accelerations.add(accel.abs());
      }
    }

    final avgAcceleration = accelerations.isEmpty
        ? 0.0
        : accelerations.reduce((a, b) => a + b) / accelerations.length;
    final maxAcceleration =
        accelerations.isEmpty ? 0.0 : accelerations.reduce(max);
    final accelerationVariance = accelerations.isEmpty
        ? 0.0
        : _calculateVariance(accelerations, avgAcceleration);

    // Distance calculation using Haversine formula
    double totalDistance = 0.0;
    for (int i = 1; i < window.length; i++) {
      totalDistance += _calculateDistance(
        window[i - 1].latitude,
        window[i - 1].longitude,
        window[i].latitude,
        window[i].longitude,
      );
    }

    // Bearing calculations
    final bearings = <double>[];
    for (int i = 1; i < window.length; i++) {
      final bearing = _calculateBearing(
        window[i - 1].latitude,
        window[i - 1].longitude,
        window[i].latitude,
        window[i].longitude,
      );
      bearings.add(bearing);
    }

    final avgBearing =
        bearings.isEmpty ? 0.0 : _calculateAverageBearing(bearings);
    final bearingVariance = bearings.isEmpty
        ? 0.0
        : _calculateBearingVariance(bearings, avgBearing);

    final duration = window.last.timestamp.difference(window.first.timestamp);

    return ActivityFeatures(
      avgSpeed: avgSpeed,
      maxSpeed: maxSpeed,
      minSpeed: minSpeed,
      speedVariance: speedVariance,
      avgAcceleration: avgAcceleration,
      maxAcceleration: maxAcceleration,
      accelerationVariance: accelerationVariance,
      distanceTraveled: totalDistance,
      bearing: avgBearing,
      bearingVariance: bearingVariance,
      dataPoints: window.length,
      windowDuration: duration,
    );
  }

  PredictedActivity _predictActivityWithEnsemble(ActivityFeatures features) {
    final predictions = <ActivityType, double>{};

    predictions.addAll(_ruleBasedClassifier(features, _activityThresholds));
    predictions.addAll(_speedBasedClassifier(features));
    predictions.addAll(_accelerationBasedClassifier(features));

    ActivityType bestActivity = ActivityType.unknown;
    double bestConfidence = 0.0;

    predictions.forEach((activity, confidence) {
      if (confidence > bestConfidence) {
        bestActivity = activity;
        bestConfidence = confidence;
      }
    });

    if (bestConfidence < _confidenceThreshold) {
      bestActivity = ActivityType.unknown;
      bestConfidence = 0.5;
    }

    return PredictedActivity(
      type: bestActivity,
      confidence: bestConfidence,
      metadata: {
        'features': features.toMap(),
        'all_predictions': predictions,
      },
    );
  }

  // --- UPDATED: This classifier now uses the thresholds map ---
  Map<ActivityType, double> _ruleBasedClassifier(ActivityFeatures features,
      Map<ActivityType, Map<String, double>> thresholds) {
    final scores = <ActivityType, double>{};

    final still = thresholds[ActivityType.still]!;
    if (features.avgSpeed < still['maxAvgSpeed']! &&
        features.maxAcceleration < still['maxAcceleration']!) {
      scores[ActivityType.still] = 0.95 - (features.avgSpeed * 0.1);
    }

    final walking = thresholds[ActivityType.walking]!;
    if (features.avgSpeed >= walking['minAvgSpeed']! &&
        features.avgSpeed <= walking['maxAvgSpeed']! &&
        features.maxAcceleration < walking['maxAcceleration']! &&
        features.speedVariance < walking['maxSpeedVariance']!) {
      scores[ActivityType.walking] =
          0.85 + (features.avgSpeed > 3.0 ? 0.1 : 0.0);
    }

    final cycling = thresholds[ActivityType.cycling]!;
    if (features.avgSpeed >= cycling['minAvgSpeed']! &&
        features.avgSpeed <= cycling['maxAvgSpeed']! &&
        features.maxAcceleration < cycling['maxAcceleration']!) {
      scores[ActivityType.cycling] =
          0.80 + (features.avgSpeed > 15.0 ? 0.1 : 0.0);
    }

    final driving = thresholds[ActivityType.driving]!;
    if (features.avgSpeed >= driving['minAvgSpeed']! &&
        features.maxAcceleration > driving['minMaxAcceleration']!) {
      scores[ActivityType.driving] = 0.75 + min(features.avgSpeed / 50.0, 0.2);
    }

    return scores;
  }

  Map<ActivityType, double> _speedBasedClassifier(ActivityFeatures features) {
    final scores = <ActivityType, double>{};

    if (features.avgSpeed < 3.0) {
      scores[ActivityType.still] = 0.9;
    } else if (features.avgSpeed < 10.0) {
      scores[ActivityType.walking] = 0.8;
    } else if (features.avgSpeed < 30.0) {
      scores[ActivityType.cycling] = 0.75;
    } else {
      scores[ActivityType.driving] = 0.85;
    }

    return scores;
  }

  Map<ActivityType, double> _accelerationBasedClassifier(
      ActivityFeatures features) {
    final scores = <ActivityType, double>{};

    if (features.avgAcceleration < 1.0) {
      scores[ActivityType.still] = 0.7;
    } else if (features.avgAcceleration < 3.0) {
      scores[ActivityType.walking] = 0.6;
    } else if (features.avgAcceleration < 5.0) {
      scores[ActivityType.cycling] = 0.65;
    } else {
      scores[ActivityType.driving] = 0.7;
    }

    return scores;
  }

  PredictedActivity _applTemporalSmoothing(
      PredictedActivity currentPrediction) {
    if (_recentPredictions.isEmpty) {
      return currentPrediction;
    }

    // Count recent predictions of the same type
    final recentSameType = _recentPredictions
        .where((p) => p.type == currentPrediction.type)
        .length;

    // Boost confidence if we've seen this activity recently
    double adjustedConfidence = currentPrediction.confidence;
    if (recentSameType >= 2) {
      adjustedConfidence = min(1.0, currentPrediction.confidence + 0.1);
    }

    // Penalize if this is a sudden change
    final lastPrediction = _recentPredictions.last;
    if (lastPrediction.type != currentPrediction.type &&
        lastPrediction.confidence > 0.8) {
      adjustedConfidence = max(0.5, currentPrediction.confidence - 0.2);
    }

    return PredictedActivity(
      type: currentPrediction.type,
      confidence: adjustedConfidence,
      metadata: {
        ...currentPrediction.metadata,
        'temporal_smoothing_applied': true,
        'original_confidence': currentPrediction.confidence,
      },
    );
  }

  void _addToHistory(PredictedActivity prediction) {
    _recentPredictions.add(prediction);
    if (_recentPredictions.length > _maxHistorySize) {
      _recentPredictions.removeAt(0);
    }
  }

  // Utility functions
  double _calculateVariance(List<double> values, double mean) {
    if (values.length <= 1) return 0.0;
    final sumSquaredDiffs =
        values.map((v) => pow(v - mean, 2)).reduce((a, b) => a + b);
    return sumSquaredDiffs / values.length;
  }

  double _calculateDistance(
      double lat1, double lon1, double lat2, double lon2) {
    const double earthRadius = 6371000; // meters
    final dLat = _degreesToRadians(lat2 - lat1);
    final dLon = _degreesToRadians(lon2 - lon1);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_degreesToRadians(lat1)) *
            cos(_degreesToRadians(lat2)) *
            sin(dLon / 2) *
            sin(dLon / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadius * c;
  }

  double _calculateBearing(double lat1, double lon1, double lat2, double lon2) {
    final dLon = _degreesToRadians(lon2 - lon1);
    final y = sin(dLon) * cos(_degreesToRadians(lat2));
    final x = cos(_degreesToRadians(lat1)) * sin(_degreesToRadians(lat2)) -
        sin(_degreesToRadians(lat1)) * cos(_degreesToRadians(lat2)) * cos(dLon);
    return _radiansToDegrees(atan2(y, x));
  }

  double _calculateAverageBearing(List<double> bearings) {
    if (bearings.isEmpty) return 0.0;
    final radians = bearings.map(_degreesToRadians);
    final x = radians.map(cos).reduce((a, b) => a + b) / bearings.length;
    final y = radians.map(sin).reduce((a, b) => a + b) / bearings.length;
    return _radiansToDegrees(atan2(y, x));
  }

  double _calculateBearingVariance(List<double> bearings, double meanBearing) {
    if (bearings.length <= 1) return 0.0;
    final diffs = bearings.map((b) {
      var diff = (b - meanBearing).abs();
      if (diff > 180) diff = 360 - diff;
      return diff;
    });
    return diffs.reduce((a, b) => a + b) / bearings.length;
  }

  double _degreesToRadians(double degrees) => degrees * pi / 180.0;
  double _radiansToDegrees(double radians) => radians * 180.0 / pi;

  void dispose() {
    _activityController.close();
  }
}
