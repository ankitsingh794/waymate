import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_bluetooth_serial/flutter_bluetooth_serial.dart';
import 'package:network_info_plus/network_info_plus.dart';
import 'package:permission_handler/permission_handler.dart';

class CompanionDetectionService {
  static final CompanionDetectionService _instance =
      CompanionDetectionService._internal();
  factory CompanionDetectionService() => _instance;
  CompanionDetectionService._internal();

  final _companionController = StreamController<CompanionEstimate>.broadcast();
  Timer? _scanTimer;
  Set<String> _nearbyDevices = {};
  Set<String> _nearbyNetworks = {};

  Stream<CompanionEstimate> get companionStream => _companionController.stream;

  Future<void> startCompanionDetection() async {
    try {
      // Request permissions
      await _requestPermissions();

      // Start periodic scanning
      _scanTimer =
          Timer.periodic(Duration(seconds: 30), (_) => _scanForCompanions());

      debugPrint('CompanionDetectionService started');
    } catch (e) {
      debugPrint('Error starting companion detection: $e');
    }
  }

  Future<void> _requestPermissions() async {
    if (Platform.isAndroid) {
      await Permission.bluetooth.request();
      await Permission.bluetoothScan.request();
      await Permission.bluetoothConnect.request();
      await Permission.location.request();
    }
  }

  Future<void> _scanForCompanions() async {
    try {
      // Bluetooth device scanning
      await _scanBluetoothDevices();

      // WiFi network scanning
      await _scanWiFiNetworks();

      // Estimate companions based on device density changes
      final estimate = _estimateCompanions();

      debugPrint(
          'Companion scan: BT devices: ${_nearbyDevices.length}, WiFi: ${_nearbyNetworks.length}');
      _companionController.add(estimate);
    } catch (e) {
      debugPrint('Error during companion scanning: $e');
    }
  }

  Future<void> _scanBluetoothDevices() async {
    try {
      final isEnabled = await FlutterBluetoothSerial.instance.isEnabled;
      if (isEnabled == true) {
        final devices =
            await FlutterBluetoothSerial.instance.getBondedDevices();
        _nearbyDevices = devices.map((d) => d.address).toSet();
      }
    } catch (e) {
      debugPrint('Bluetooth scan error: $e');
    }
  }

  Future<void> _scanWiFiNetworks() async {
    try {
      final info = NetworkInfo();
      final wifiName = await info.getWifiName();
      final wifiBSSID = await info.getWifiBSSID();

      if (wifiName != null && wifiBSSID != null) {
        _nearbyNetworks.add(wifiBSSID);
      }
    } catch (e) {
      debugPrint('WiFi scan error: $e');
    }
  }

  CompanionEstimate _estimateCompanions() {
    final deviceDensity = _nearbyDevices.length;
    final networkDensity = _nearbyNetworks.length;

    // Simple heuristic - can be improved with ML
    int estimatedCompanions = 0;
    double confidence = 0.5;

    if (deviceDensity == 0 && networkDensity <= 1) {
      // Likely alone
      estimatedCompanions = 0;
      confidence = 0.8;
    } else if (deviceDensity <= 2 && networkDensity <= 3) {
      // Possibly 1-2 companions
      estimatedCompanions = 1;
      confidence = 0.6;
    } else if (deviceDensity <= 5 && networkDensity <= 6) {
      // Small group
      estimatedCompanions = 2;
      confidence = 0.7;
    } else {
      // Large group or public transport
      estimatedCompanions = 3;
      confidence = 0.5;
    }

    return CompanionEstimate(
      companionCount: estimatedCompanions,
      confidence: confidence,
      metadata: {
        'bluetooth_devices': deviceDensity,
        'wifi_networks': networkDensity,
        'timestamp': DateTime.now().toIso8601String(),
      },
    );
  }

  void stopCompanionDetection() {
    _scanTimer?.cancel();
    debugPrint('CompanionDetectionService stopped');
  }

  void dispose() {
    stopCompanionDetection();
    _companionController.close();
  }
}

class CompanionEstimate {
  final int companionCount;
  final double confidence;
  final Map<String, dynamic> metadata;

  CompanionEstimate({
    required this.companionCount,
    required this.confidence,
    required this.metadata,
  });

  @override
  String toString() =>
      'CompanionEstimate(count: $companionCount, confidence: $confidence)';
}
