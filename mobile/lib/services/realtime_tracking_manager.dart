import 'dart:async';
import 'dart:math';
import 'package:collection/collection.dart';
import 'package:flutter/foundation.dart';
import 'package:mobile/services/ml_service.dart';
import 'package:mobile/services/sensor_service.dart';
import 'package:mobile/services/tracking_service.dart';
import 'package:mobile/services/tracking_events.dart';

enum TrackingState { idle, tripCandidate, pendingConfirmation, onTrip }

class RealtimeTrackingManager {
  final SensorService _sensorService = SensorService();
  final MLService _mlService = MLService();
  final TrackingService _trackingService = TrackingService();

  // Stream controller to send events to the UI
  final StreamController<TrackingEvent> _eventController = StreamController<TrackingEvent>.broadcast();
  Stream<TrackingEvent> get events => _eventController.stream;

  StreamSubscription? _sensorSubscription;
  Timer? _windowTimer;

  // --- Configuration ---
  static const int _windowDurationSeconds = 10;
  static const double _highConfidenceThreshold = 0.80; // Auto-start trip
  static const double _mediumConfidenceThreshold = 0.65; // Nudge user
  static const int _tripEndIdleMinutes = 5;
  static const int _candidateConfirmationWindows = 2; // ~20s to confirm movement
  static const int _modeChangeConfirmationWindows = 3; // ~30s to confirm mode change

  // --- State ---
  TrackingState _state = TrackingState.idle;
  String? _activeTripId;
  String? _tempTripId; // For nudging
  PredictedActivity? _currentTripMode;
  final List<TrackingPoint> _pointBuffer = [];
  int _consecutiveMovingWindows = 0;
  int _consecutiveModeChangeWindows = 0;
  DateTime? _becameIdleAt;

  void start() {
    _sensorService.startTracking();
    _sensorSubscription = _sensorService.trackingPointStream.listen(_onNewPoint);
    _windowTimer = Timer.periodic(const Duration(seconds: _windowDurationSeconds), _processWindow);
  }

  void stop() {
    _sensorSubscription?.cancel();
    _windowTimer?.cancel();
    _sensorService.stopTracking();
    _mlService.dispose();
    debugPrint("RealtimeTrackingManager stopped.");
  }

  void _onNewPoint(TrackingPoint point) => _pointBuffer.add(point);

  // Called by the UI in response to a nudge
  Future<void> confirmTripStart(bool confirmed) async {
    if (_state != TrackingState.pendingConfirmation || _tempTripId == null) return;
    _eventController.add(HideNudge());

    if (confirmed) {
        final confirmedTripId = await _trackingService.confirmTripStart(_tempTripId!);
        _activeTripId = confirmedTripId;
        _state = TrackingState.onTrip;
        debugPrint("✅ Trip confirmed by user. Active ID: $_activeTripId");
    } else {
        await _trackingService.cancelTrip(_tempTripId!);
        _state = TrackingState.idle;
        debugPrint(" Trip cancelled by user.");
    }
    _tempTripId = null;
  }

  Future<void> _processWindow(Timer timer) async {
    if (_pointBuffer.isEmpty) { /* ... idle check unchanged ... */ return; }

    final windowPoints = List<TrackingPoint>.from(_pointBuffer);
    _pointBuffer.clear();

    final features = _extractFeatures(windowPoints);
    if (features.isEmpty) return;

    final prediction = await _mlService.predictActivity(features);
    final isMoving = prediction.activity != PredictedActivity.idle;

    switch (_state) {
      case TrackingState.idle:
        if (isMoving) {
          _state = TrackingState.tripCandidate;
          _consecutiveMovingWindows = 1;
        }
        break;

      case TrackingState.tripCandidate:
        if (isMoving) {
          _consecutiveMovingWindows++;
          if (_consecutiveMovingWindows >= _candidateConfirmationWindows) {
            if (prediction.confidence >= _highConfidenceThreshold) {
              await _startTrip(windowPoints.first, prediction.activity, isConfirmed: true);
            } else if (prediction.confidence >= _mediumConfidenceThreshold) {
              await _startTrip(windowPoints.first, prediction.activity, isConfirmed: false);
            }
          }
        } else { // False alarm
          _state = TrackingState.idle;
          _consecutiveMovingWindows = 0;
        }
        break;
      
      case TrackingState.pendingConfirmation:
        // Waiting for user input, do nothing but keep collecting data
        break;

      case TrackingState.onTrip:
        await _trackingService.appendTripData(_activeTripId!, windowPoints);
        // Check for mode change
        if (isMoving && prediction.activity != _currentTripMode) {
            _consecutiveModeChangeWindows++;
            if (_consecutiveModeChangeWindows >= _modeChangeConfirmationWindows) {
                await _changeTripMode(prediction.activity);
            }
        } else {
            _consecutiveModeChangeWindows = 0;
        }
        // Check for trip end
        if (!isMoving) {
          _becameIdleAt ??= DateTime.now();
          if (DateTime.now().difference(_becameIdleAt!).inMinutes >= _tripEndIdleMinutes) {
            await _endTrip(windowPoints.last);
          }
        } else {
          _becameIdleAt = null;
        }
        break;
    }
  }

  Future<void> _startTrip(TrackingPoint startPoint, PredictedActivity mode, {required bool isConfirmed}) async {
    try {
      final response = await _trackingService.startTrip(startPoint, mode, isConfirmed: isConfirmed);
      _currentTripMode = mode;
      _consecutiveMovingWindows = 0;

      if (isConfirmed) {
        _activeTripId = response['tripId'];
        _state = TrackingState.onTrip;
        debugPrint("✅ Trip auto-started with ID: $_activeTripId");
      } else {
        _tempTripId = response['tripId'];
        _state = TrackingState.pendingConfirmation;
        _eventController.add(ShowTripStartNudge(predictedActivity: mode, temporaryTripId: _tempTripId!));
        debugPrint(" Nudging user to confirm trip ID: $_tempTripId");
      }
    } catch (e) {
      _state = TrackingState.idle;
    }
  }
  
  Future<void> _changeTripMode(PredictedActivity newMode) async {
    try {
        await _trackingService.changeTripMode(_activeTripId!, newMode);
        _currentTripMode = newMode;
        _consecutiveModeChangeWindows = 0;
        debugPrint("🔄 Trip mode changed to $newMode");
    } catch (e) {
        debugPrint("Error changing trip mode: $e");
    }
  }
  

  Future<void> _endTrip([TrackingPoint? lastPoint]) async {
      if (_activeTripId == null) return;
      debugPrint("Ending trip ID: $_activeTripId");

      try {
          await _trackingService.endTrip(_activeTripId!, lastPoint);
      } catch (e) {
          debugPrint("Error ending trip: $e");
      } finally {
          _activeTripId = null;
          _state = TrackingState.idle;
          _consecutiveMovingWindows = 0;
          _becameIdleAt = null;
          debugPrint("🛑 Trip ended. State reset to idle.");
      }
  }

  Map<String, double> _extractFeatures(List<TrackingPoint> points) {
    if (points.isEmpty) return {};

    final validPoints = points.where((p) => p.speed >= 0 && p.accuracy > 0).toList();
    if (validPoints.isEmpty) return {};

    final speeds = validPoints.map((p) => p.speed).toList();
    final accuracies = validPoints.map((p) => p.accuracy).toList();

    final soundDbs = points.map((p) => p.soundDb ?? 0.0).where((d) => d > -double.infinity).toList();
    final avgSoundDb = soundDbs.isNotEmpty ? soundDbs.average : 0.0;
    
    final accelMags = validPoints
        .where((p) => p.accelerometerX != null)
        .map((p) => sqrt(pow(p.accelerometerX!, 2) + pow(p.accelerometerY!, 2) + pow(p.accelerometerZ!, 2)))
        .toList();

    final gyroMags = validPoints
        .where((p) => p.gyroscopeX != null)
        .map((p) => sqrt(pow(p.gyroscopeX!, 2) + pow(p.gyroscopeY!, 2) + pow(p.gyroscopeZ!, 2)))
        .toList();

    final avgSpeed = speeds.average;
    final maxSpeed = speeds.max;
    final speedStdDev = _calculateStdDev(speeds, avgSpeed);
    
    speeds.sort();
    final speedPctl95 = speeds[(speeds.length * 0.95).floor()];

    final accelAvgMag = accelMags.isNotEmpty ? accelMags.average : 0.0;
    final accelStdDevMag = accelMags.isNotEmpty ? _calculateStdDev(accelMags, accelAvgMag) : 0.0;

    final gyroAvgMag = gyroMags.isNotEmpty ? gyroMags.average : 0.0;
    final gyroStdDevMag = gyroMags.isNotEmpty ? _calculateStdDev(gyroMags, gyroAvgMag) : 0.0;

    final avgAccuracy = accuracies.average;

    return {
      'avgSpeed': avgSpeed * 3.6, // km/h
      'maxSpeed': maxSpeed * 3.6, // km/h
      'speedStdDev': speedStdDev,
      'speedPctl95': speedPctl95 * 3.6, // km/h
      'accelAvgMag': accelAvgMag,
      'accelStdDevMag': accelStdDevMag,
      'gyroAvgMag': gyroAvgMag,
      'gyroStdDevMag': gyroStdDevMag,
      'avgAccuracy': avgAccuracy,
      'avgSoundDb': avgSoundDb,
    };
  }

  double _calculateStdDev(List<double> values, double mean) {
    if (values.length < 2) return 0.0;
    final variance = values.map((v) => pow(v - mean, 2)).sum / (values.length - 1);
    return sqrt(variance);
  }
}
