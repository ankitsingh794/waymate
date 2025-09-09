import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:sound_stream/sound_stream.dart'; // Add `sound_stream` to pubspec.yaml
import 'package:mobile/services/tracking_service.dart';

/// Service to handle the collection of data from all device sensors.
class SensorService {
  StreamSubscription<Position>? _positionSubscription;
  StreamSubscription<AccelerometerEvent>? _accelerometerSubscription;
  StreamSubscription<GyroscopeEvent>? _gyroscopeSubscription;
  StreamSubscription<dynamic>? _soundSubscription;

  AccelerometerEvent? _lastAccelerometerEvent;
  GyroscopeEvent? _lastGyroscopeEvent;
  double _lastSoundDb = 0.0;

  final RecorderStream _recorder = RecorderStream();
  final StreamController<TrackingPoint> _trackingPointController = StreamController<TrackingPoint>.broadcast();
  
  Stream<TrackingPoint> get trackingPointStream => _trackingPointController.stream;

  Future<void> startTracking() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _trackingPointController.addError('Location services are disabled.');
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _trackingPointController.addError('Location permissions are denied.');
        return;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      _trackingPointController.addError('Location permissions are permanently denied.');
      return;
    } 

     await _recorder.initialize();

    // Start all sensor streams
    _accelerometerSubscription = accelerometerEventStream().listen((event) => _lastAccelerometerEvent = event);
    _gyroscopeSubscription = gyroscopeEventStream().listen((event) => _lastGyroscopeEvent = event);
    
    await _recorder.start();
    _soundSubscription = _recorder.audioStream.listen((data) {
        // Simple RMS calculation for volume (decibels)
        var sum = data.map((s) => s * s).reduce((a, b) => a + b);
        var rms = sqrt(sum / data.length);
        _lastSoundDb = 20 * log(rms) / ln10; // Convert to dB
    });

    const locationSettings = LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 10);
    _positionSubscription = Geolocator.getPositionStream(locationSettings: locationSettings).listen((Position p) {
      final trackingPoint = TrackingPoint(
        latitude: p.latitude, longitude: p.longitude, accuracy: p.accuracy,
        speed: p.speed, timestamp: p.timestamp,
        accelerometerX: _lastAccelerometerEvent?.x, accelerometerY: _lastAccelerometerEvent?.y, accelerometerZ: _lastAccelerometerEvent?.z,
        gyroscopeX: _lastGyroscopeEvent?.x, gyroscopeY: _lastGyroscopeEvent?.y, gyroscopeZ: _lastGyroscopeEvent?.z,
        soundDb: _lastSoundDb,
      );
      _trackingPointController.add(trackingPoint);
    }, onError: (e) => _trackingPointController.addError(e));

    debugPrint("SensorService started tracking all sensors.");
  }

  void stopTracking() {
    _positionSubscription?.cancel();
    _accelerometerSubscription?.cancel();
    _gyroscopeSubscription?.cancel();
    _soundSubscription?.cancel();
    _recorder.stop();
    debugPrint("SensorService stopped tracking.");
  }

  void dispose() {
    _trackingPointController.close();
    stopTracking();
  }
}
