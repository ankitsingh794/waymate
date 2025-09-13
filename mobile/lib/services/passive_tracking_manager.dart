// lib/services/passive_tracking_manager.dart

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:mobile/services/ml_service.dart';
import 'package:mobile/services/permission_service.dart';
import 'package:mobile/services/sensor_service.dart';
import 'package:mobile/services/tracking_service.dart';
import 'package:mobile/services/tracking_events.dart';

// Defines the current state of the passive tracking
enum TrackingState { idle, monitoring, awaitingConfirmation, inProgress }

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

      // Prevent multiple subscriptions
      _sensorService.trackingPointStream.listen(_onNewTrackingPoint);
      _mlService.predictedActivityStream.listen(_onActivityChanged);
      await _sensorService.startTracking();
      debugPrint("✅ PassiveTrackingManager started successfully");
      return true;
    } catch (e) {
      debugPrint("❌ PassiveTrackingManager start failed: $e");
      _eventController.add(TrackingError("Failed to start tracking: $e"));
      return false;
    }
  }

  void stop() {
    _sensorService.stopTracking();
    debugPrint("PassiveTrackingManager stopped.");
  }

  void _onNewTrackingPoint(TrackingPoint point) {
    if (_currentState == TrackingState.monitoring ||
        _currentState == TrackingState.inProgress) {
      _pointBuffer.add(point);
    }
    // Periodically send data if a trip is in progress
    if (_currentState == TrackingState.inProgress &&
        _pointBuffer.length >= 15) {
      _trackingService.appendTripData(_currentTripId!, _pointBuffer);
      _pointBuffer.clear(); // Clear buffer after sending
    }
  }

  void _onActivityChanged(PredictedActivity activity) {
    debugPrint(
        "Activity Changed: ${activity.type.name}, Confidence: ${activity.confidence}, State: $_currentState");

    // --- Trip Start Logic ---
    // If we're idle and become still, we start monitoring for a potential trip.
    if (_currentState == TrackingState.idle &&
        activity.type == ActivityType.still) {
      _currentState = TrackingState.monitoring;
      _pointBuffer.clear(); // Start fresh buffer
    }
    // If we were monitoring and start moving, it's a potential trip.
    else if (_currentState == TrackingState.monitoring &&
        activity.type != ActivityType.still) {
      _handlePotentialTripStart(activity);
    }

    // --- Trip End Logic ---
    // If a trip is in progress and we become still, start a timer. If we stay still, the trip ends.
    if (_currentState == TrackingState.inProgress &&
        activity.type == ActivityType.still) {
      _stillTimer?.cancel();
      _stillTimer = Timer(const Duration(minutes: 3), _handleTripEnd);
    } else if (_currentState == TrackingState.inProgress &&
        activity.type != ActivityType.still) {
      // If we start moving again, cancel the end-trip timer.
      _stillTimer?.cancel();
    }
  }

  Future<void> _handlePotentialTripStart(PredictedActivity activity) async {
    if (_pointBuffer.isEmpty) return; // Cannot start a trip with no data
    _currentState = TrackingState.awaitingConfirmation;
    try {
      // Call backend to create a temporary trip placeholder
      final response = await _trackingService.startTrip(_pointBuffer.first);
      _currentTripId = response['tripId']; // This is the temporary ID

      // Nudge the user for confirmation to start recording
      _eventController.add(ShowTripStartNudge(
        predictedActivity: activity,
        temporaryTripId: _currentTripId!,
      ));
    } catch (e) {
      debugPrint("Error handling potential trip start: $e");
      _currentState = TrackingState.idle; // Reset on error
    }
  }

  Future<void> _handleTripEnd() async {
    if (_currentTripId == null) return;

    debugPrint(
        "User has been still for 3 minutes. Ending trip $_currentTripId");
    try {
      // Send any remaining buffered points and signal the end of the trip
      if (_pointBuffer.isNotEmpty) {
        await _trackingService.appendTripData(_currentTripId!, _pointBuffer);
      }
      await _trackingService.endTrip(_currentTripId!, _pointBuffer.last);
    } catch (e) {
      debugPrint("Error ending trip: $e");
    } finally {
      // Reset state regardless of success/fail
      _currentState = TrackingState.idle;
      _pointBuffer.clear();
      _currentTripId = null;
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
}
