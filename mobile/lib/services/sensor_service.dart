import 'dart:async';
import 'tracking_service.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:sensors_plus/sensors_plus.dart';

/// Service to handle the collection of data from all device sensors.
class SensorService {
  StreamSubscription<Position>? _positionSubscription;
  StreamSubscription<AccelerometerEvent>? _accelerometerSubscription;
  StreamSubscription<GyroscopeEvent>? _gyroscopeSubscription;
  StreamSubscription<RecordingDisposition>? _soundSubscription;

  AccelerometerEvent? _lastAccelerometerEvent;
  GyroscopeEvent? _lastGyroscopeEvent;
  double _lastSoundDb = 0.0;

  // UPDATED: Replaced RecorderStream with FlutterSoundRecorder.
  final FlutterSoundRecorder _recorder = FlutterSoundRecorder();
  final StreamController<TrackingPoint> _trackingPointController =
      StreamController<TrackingPoint>.broadcast();

  Stream<TrackingPoint> get trackingPointStream =>
      _trackingPointController.stream;

  Future<void> startTracking() async {
    try {
      // --- Permission Handling ---
      // 1. Location Permissions (existing logic)
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw 'Location services are disabled.';
      }

      LocationPermission locationPermission = await Geolocator.checkPermission();
      if (locationPermission == LocationPermission.denied) {
        locationPermission = await Geolocator.requestPermission();
        if (locationPermission == LocationPermission.denied) {
          throw 'Location permissions are denied.';
        }
      }

      if (locationPermission == LocationPermission.deniedForever) {
        throw 'Location permissions are permanently denied.';
      }

      // 2. Microphone Permission (NEW)
      PermissionStatus micPermission = await Permission.microphone.request();
      if (micPermission != PermissionStatus.granted) {
        throw 'Microphone permission is required for sound level tracking.';
      }

      // --- Sensor Initialization ---
      // Open the recorder session. This must be done before starting.
      await _recorder.openRecorder();

      // Start all sensor streams
      _accelerometerSubscription = accelerometerEventStream()
          .listen((event) => _lastAccelerometerEvent = event);
      _gyroscopeSubscription =
          gyroscopeEventStream().listen((event) => _lastGyroscopeEvent = event);

      // UPDATED: Start flutter_sound recorder and subscribe to its progress stream.
      // We don't need the audio data itself, just the decibel level.
      // Set a subscription duration to get decibel updates periodically.
      await _recorder.setSubscriptionDuration(
        const Duration(milliseconds: 500),
      );

      await _recorder.startRecorder(
        toFile: 'tau.aac', // A temporary file is needed, it can be overwritten.
        codec: Codec.aacADTS,
        sampleRate: 16000, // Reduce sample rate to save battery
      );

      _soundSubscription = _recorder.onProgress!.listen((disposition) {
        if (disposition.decibels != null) {
          _lastSoundDb = disposition.decibels!;
        }
      });

      // --- Position Stream (Main Data Point Collector) ---
      const locationSettings =
          LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 10);
      _positionSubscription =
          Geolocator.getPositionStream(locationSettings: locationSettings)
              .listen((Position p) {
        final trackingPoint = TrackingPoint(
          latitude: p.latitude,
          longitude: p.longitude,
          accuracy: p.accuracy,
          speed: p.speed,
          timestamp: p.timestamp,
          accelerometerX: _lastAccelerometerEvent?.x,
          accelerometerY: _lastAccelerometerEvent?.y,
          accelerometerZ: _lastAccelerometerEvent?.z,
          gyroscopeX: _lastGyroscopeEvent?.x,
          gyroscopeY: _lastGyroscopeEvent?.y,
          gyroscopeZ: _lastGyroscopeEvent?.z,
          soundDb: _lastSoundDb,
        );
        _trackingPointController.add(trackingPoint);
      }, onError: (e) => _trackingPointController.addError(e));

      debugPrint("SensorService started tracking all sensors.");
    } catch (e) {
      _trackingPointController.addError(e.toString());
      // Ensure we clean up if setup fails.
      await stopTracking();
    }
  }

  Future<void> stopTracking() async {
    _positionSubscription?.cancel();
    _accelerometerSubscription?.cancel();
    _gyroscopeSubscription?.cancel();
    _soundSubscription?.cancel();

    // UPDATED: Stop the recorder if it's recording.
    if (_recorder.isRecording) {
      await _recorder.stopRecorder();
    }
    debugPrint("SensorService stopped tracking.");
  }

  Future<void> dispose() async {
    await stopTracking();
    // UPDATED: Close the recorder to release all native resources.
    if (_recorder.isRecording) {
      await _recorder.closeRecorder();
    }
    _trackingPointController.close();
  }
}
