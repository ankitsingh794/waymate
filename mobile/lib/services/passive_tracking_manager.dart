// lib/services/passive_tracking_manager.dart

import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:mobile/services/ml_service.dart';
import 'package:mobile/services/permission_service.dart';
import 'package:mobile/services/sensor_service.dart';
import 'package:mobile/services/tracking_service.dart';
import 'package:mobile/services/tracking_events.dart';
import 'package:mobile/utils/logger.dart';

// Defines the current state of the passive tracking
enum TrackingState {
  idle,
  monitoring,
  awaitingConfirmation,
  inProgress,
  awaitingTripConfirmation // New state for post-trip confirmation
}

class PassiveTrackingManager {
  static final PassiveTrackingManager _instance =
      PassiveTrackingManager._internal();
  factory PassiveTrackingManager() => _instance;
  PassiveTrackingManager._internal();

  final SensorService _sensorService = SensorService();
  final MLService _mlService = MLService();
  final TrackingService _trackingService = TrackingService();

  // State variables
  TrackingState _currentState = TrackingState.idle;
  String? _currentTripId; // Can be temporary or permanent
  final List<TrackingPoint> _pointBuffer = [];
  Timer? _stillTimer;

  // Trip detection parameters
  static const double _minimumTripDistance = 500.0; // 500 meters
  static const int _stillDurationMinutes = 5; // 5 minutes of being still
  static const int _monitoringDurationMinutes =
      2; // Monitor for 2 minutes before checking distance

  // Location tracking for distance calculation
  TrackingPoint? _lastSignificantLocation;
  TrackingPoint? _tripStartLocation;
  Timer? _monitoringTimer;

  // Stream for the UI to listen to for "nudges"
  final _eventController = StreamController<TrackingEvent>.broadcast();
  Stream<TrackingEvent> get trackingEvents => _eventController.stream;

  Future<bool> start() async {
    try {
      // Validate permissions before starting tracking
      bool hasLocation = await PermissionService.hasLocationPermission();
      if (!hasLocation) {
        debugPrint("❌ PassiveTrackingManager: Location permission not granted");
        _eventController.add(
            PermissionError("Location permission required for trip tracking"));
        return false;
      }

      // Check for activity recognition permission (CRITICAL for passive tracking)
      bool hasActivityRecognition =
          await PermissionService.hasActivityRecognitionPermission();
      if (!hasActivityRecognition) {
        debugPrint(
            "❌ PassiveTrackingManager: Activity recognition permission not granted");

        // Try to request the permission automatically
        debugPrint(
            "🔄 Attempting to request activity recognition permission...");
        bool granted =
            await PermissionService.requestActivityRecognitionPermission();

        if (!granted) {
          _eventController.add(PermissionError(
              "Activity recognition permission is required for automatic trip detection. Please enable 'Physical activity' permission in app settings."));
          return false;
        }

        debugPrint("✅ Activity recognition permission granted");
      }

      // Prevent multiple subscriptions
      _sensorService.trackingPointStream.listen(_onNewTrackingPoint);
      _mlService.predictedActivityStream.listen(_onActivityChanged);

      try {
        await _sensorService.startTracking();
      } catch (sensorError) {
        // Handle microphone permission or other sensor errors gracefully
        logger.w("Sensor tracking initialization failed: $sensorError");
        _eventController.add(PermissionError("$sensorError"));
        // Continue with limited tracking even if sensor tracking fails
      }

      logger.i("PassiveTrackingManager started successfully");
      return true;
    } catch (e, s) {
      logger.e("PassiveTrackingManager start failed", error: e, stackTrace: s);
      _eventController.add(TrackingError("Failed to start tracking: $e"));
      return false;
    }
  }

  void stop() {
    _sensorService.stopTracking();
    _stillTimer?.cancel();
    _monitoringTimer?.cancel();
    logger.i("PassiveTrackingManager stopped.");
  }

  /// Calculate distance between two tracking points using Haversine formula
  double _calculateDistance(TrackingPoint point1, TrackingPoint point2) {
    const double earthRadius = 6371000; // Earth's radius in meters

    double lat1Rad = point1.latitude * (pi / 180);
    double lat2Rad = point2.latitude * (pi / 180);
    double deltaLatRad = (point2.latitude - point1.latitude) * (pi / 180);
    double deltaLonRad = (point2.longitude - point1.longitude) * (pi / 180);

    double a = sin(deltaLatRad / 2) * sin(deltaLatRad / 2) +
        cos(lat1Rad) *
            cos(lat2Rad) *
            sin(deltaLonRad / 2) *
            sin(deltaLonRad / 2);
    double c = 2 * asin(sqrt(a));

    return earthRadius * c; // Distance in meters
  }

  void _onNewTrackingPoint(TrackingPoint point) {
    // Always add points to buffer for current tracking
    if (_currentState == TrackingState.monitoring ||
        _currentState == TrackingState.inProgress) {
      _pointBuffer.add(point);
    }

    // Check for significant movement from last known location
    if (_lastSignificantLocation != null) {
      double distance = _calculateDistance(_lastSignificantLocation!, point);

      // If user has moved significantly and we're idle, start monitoring
      if (_currentState == TrackingState.idle && distance > 50.0) {
        // 50m threshold for starting monitoring
        _startMonitoringForTrip(point);
      }
    } else {
      // First location point
      _lastSignificantLocation = point;
    }

    // Update last significant location if user has moved substantially
    if (_lastSignificantLocation != null) {
      double distanceFromLast =
          _calculateDistance(_lastSignificantLocation!, point);
      if (distanceFromLast > 100.0) {
        // Update every 100m
        _lastSignificantLocation = point;
      }
    }

    // Periodically send data if a trip is in progress
    if (_currentState == TrackingState.inProgress &&
        _pointBuffer.length >= 15) {
      _trackingService.appendTripData(_currentTripId!, _pointBuffer);
      _pointBuffer.clear(); // Clear buffer after sending
    }
  }

  /// Start monitoring phase when user begins moving
  void _startMonitoringForTrip(TrackingPoint startPoint) {
    debugPrint("🔍 User started moving, beginning trip monitoring...");
    _currentState = TrackingState.monitoring;
    _tripStartLocation = startPoint;
    _pointBuffer.clear();
    _pointBuffer.add(startPoint);

    // Monitor for a period to see if this develops into a significant trip
    _monitoringTimer?.cancel();
    _monitoringTimer = Timer(Duration(minutes: _monitoringDurationMinutes), () {
      _evaluateIfSignificantTrip();
    });
  }

  /// Evaluate if the movement constitutes a significant trip
  void _evaluateIfSignificantTrip() async {
    if (_tripStartLocation == null || _pointBuffer.isEmpty) {
      _resetToIdle();
      return;
    }

    TrackingPoint currentLocation = _pointBuffer.last;
    double totalDistance =
        _calculateDistance(_tripStartLocation!, currentLocation);

    debugPrint(
        "📏 Total distance moved: ${totalDistance.toStringAsFixed(0)}m (threshold: ${_minimumTripDistance}m)");

    if (totalDistance >= _minimumTripDistance) {
      // This is a significant trip - start recording automatically
      await _startAutomaticTrip();
    } else {
      // Not significant enough, reset to idle
      debugPrint("❌ Movement not significant enough for trip detection");
      _resetToIdle();
    }
  }

  /// Start automatic trip recording when significant movement is detected
  Future<void> _startAutomaticTrip() async {
    debugPrint(
        "🚗 Starting automatic trip recording due to significant movement");
    _currentState = TrackingState.inProgress;

    try {
      // Create trip on server
      final response = await _trackingService.startTrip(_tripStartLocation!);
      _currentTripId = response['tripId'];

      // Send all buffered data points
      if (_pointBuffer.isNotEmpty) {
        await _trackingService.appendTripData(_currentTripId!, _pointBuffer);
        _pointBuffer.clear();
      }

      debugPrint("✅ Automatic trip started with ID: $_currentTripId");
    } catch (e) {
      debugPrint("❌ Error starting automatic trip: $e");
      _resetToIdle();
    }
  }

  /// Reset to idle state and clear all tracking data
  void _resetToIdle() {
    _currentState = TrackingState.idle;
    _tripStartLocation = null;
    _pointBuffer.clear();
    _monitoringTimer?.cancel();
    _stillTimer?.cancel();
    debugPrint("🔄 Reset to idle state");
  }

  void _onActivityChanged(PredictedActivity activity) {
    debugPrint(
        "Activity Changed: ${activity.type.name}, Confidence: ${activity.confidence}, State: $_currentState");

    // --- Trip End Logic ---
    // If a trip is in progress and we become still, start a timer. If we stay still, the trip ends.
    if (_currentState == TrackingState.inProgress &&
        activity.type == ActivityType.still) {
      _stillTimer?.cancel();
      _stillTimer =
          Timer(Duration(minutes: _stillDurationMinutes), _handleTripEnd);
      debugPrint(
          "⏰ User became still, starting ${_stillDurationMinutes}-minute timer to end trip");
    } else if (_currentState == TrackingState.inProgress &&
        activity.type != ActivityType.still) {
      // If we start moving again, cancel the end-trip timer.
      _stillTimer?.cancel();
      debugPrint("🏃 User started moving again, cancelled trip end timer");
    }
  }

  Future<void> _handleTripEnd() async {
    if (_currentTripId == null) return;

    debugPrint(
        "User has been still for ${_stillDurationMinutes} minutes. Ending trip $_currentTripId");

    try {
      // Send any remaining buffered points and signal the end of the trip
      if (_pointBuffer.isNotEmpty) {
        await _trackingService.appendTripData(_currentTripId!, _pointBuffer);
      }
      await _trackingService.endTrip(
          _currentTripId!, _pointBuffer.isNotEmpty ? _pointBuffer.last : null);

      // Move to confirmation state - ask user if this was actually a trip
      _currentState = TrackingState.awaitingTripConfirmation;

      // Show post-trip confirmation nudge
      _eventController.add(TripConfirmationRequired(
        tripId: _currentTripId!,
        detectedMode: 'auto_detected',
        accuracy: 85.0,
        message:
            "We detected you just completed a trip. Was this actually a trip you want to track?",
      ));
    } catch (e) {
      debugPrint("Error ending trip: $e");
      _resetToIdle();
    }
  }

  // --- Methods for the UI to call in response to nudges ---
  Future<void> userConfirmedTripStart(String temporaryTripId) async {
    _eventController.add(HideNudge());
    try {
      final permanentTripId =
          await _trackingService.confirmTripStart(temporaryTripId);
      _currentTripId =
          permanentTripId; // Update to the permanent ID from the server
      _currentState = TrackingState.inProgress;
    } catch (e) {
      _currentState = TrackingState.idle;
    }
  }

  Future<void> userCancelledTripStart(String temporaryTripId) async {
    _eventController.add(HideNudge());
    await _trackingService.cancelTrip(temporaryTripId);
    _currentState = TrackingState.idle;
    _currentTripId = null;
  }

  // --- New methods for post-trip confirmation ---
  Future<void> userConfirmedTrip(String tripId) async {
    _eventController.add(HideNudge());
    debugPrint("✅ User confirmed trip $tripId was a valid trip");
    try {
      await _trackingService.confirmTrip(tripId);
      debugPrint("☑️ Trip confirmed on server");
    } catch (e) {
      debugPrint("⚠️ Error confirming trip: $e");
    }
    _resetToIdle();
  }

  Future<void> userRejectedTrip(String tripId) async {
    _eventController.add(HideNudge());
    debugPrint("❌ User rejected trip $tripId as not a real trip");
    try {
      await _trackingService.rejectTrip(tripId);
      debugPrint("🗑️ Successfully deleted rejected trip from server");
    } catch (e) {
      debugPrint("⚠️ Error deleting rejected trip: $e");
    }

    _resetToIdle();
  }
}
