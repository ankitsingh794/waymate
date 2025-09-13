import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'dart:io';

// Import the openAppSettings function directly
import 'package:permission_handler/permission_handler.dart'
    as permission_handler;

class PermissionService {
  static Future<bool> requestAllPermissions() async {
    debugPrint('🔐 Requesting all WayMate permissions...');

    final deviceInfo = DeviceInfoPlugin();
    late int sdkInt;

    if (Platform.isAndroid) {
      final androidInfo = await deviceInfo.androidInfo;
      sdkInt = androidInfo.version.sdkInt;
      debugPrint('📱 Android SDK Version: $sdkInt');
    }

    // Core permissions needed for basic functionality
    final corePermissions = [
      Permission.location,
      Permission.locationWhenInUse,
      Permission.notification,
    ];

    // Request core permissions first
    debugPrint('🔐 Requesting core permissions...');
    Map<Permission, PermissionStatus> coreStatuses =
        await corePermissions.request();

    // Check if location permission is granted
    if (coreStatuses[Permission.location] != PermissionStatus.granted) {
      debugPrint('❌ Location permission denied - critical for WayMate');
      return false;
    }

    // Additional permissions for enhanced functionality
    final additionalPermissions = <Permission>[];

    // Storage permissions based on Android version
    if (Platform.isAndroid) {
      if (sdkInt >= 33) {
        // Android 13+ - Granular media permissions
        additionalPermissions.addAll([
          Permission.photos,
          Permission.videos,
          Permission.audio,
        ]);
      } else if (sdkInt >= 30) {
        // Android 11+ - Manage external storage
        additionalPermissions.add(Permission.manageExternalStorage);
      } else {
        // Android 10 and below - Traditional storage
        additionalPermissions.add(Permission.storage);
      }
    }

    // Background location (critical for passive tracking)
    if (Platform.isAndroid && sdkInt >= 29) {
      additionalPermissions.add(Permission.locationAlways);
    }

    // Bluetooth permissions for companion detection
    if (Platform.isAndroid) {
      if (sdkInt >= 31) {
        // Android 12+ - New Bluetooth permissions
        additionalPermissions.addAll([
          Permission.bluetoothScan,
          Permission.bluetoothConnect,
          Permission.bluetoothAdvertise,
        ]);
      } else {
        // Older Android versions
        additionalPermissions.add(Permission.bluetooth);
      }
    }

    // Sensor permissions for transport mode detection
    additionalPermissions.addAll([
      Permission.sensors,
      Permission.activityRecognition,
    ]);

    // Camera and microphone for trip documentation
    additionalPermissions.addAll([
      Permission.camera,
      Permission.microphone,
    ]);

    // Phone state for call interruption detection
    additionalPermissions.add(Permission.phone);

    // Calendar for trip planning
    additionalPermissions.add(Permission.calendarWriteOnly);

    // Request additional permissions
    debugPrint(
        '🔐 Requesting ${additionalPermissions.length} additional permissions...');

    for (final permission in additionalPermissions) {
      try {
        final status = await permission.request();
        debugPrint('🔐 ${permission.toString()}: ${status.toString()}');

        // For critical permissions, warn if denied
        if (permission == Permission.locationAlways &&
            status != PermissionStatus.granted) {
          debugPrint(
              '⚠️ Background location denied - passive tracking limited');
        }
        if (permission == Permission.storage &&
            status != PermissionStatus.granted) {
          debugPrint(
              '⚠️ Storage permission denied - export functionality limited');
        }
      } catch (e) {
        debugPrint('❌ Error requesting ${permission.toString()}: $e');
      }
    }

    // Special handling for battery optimization
    try {
      await _requestBatteryOptimizationExemption();
    } catch (e) {
      debugPrint('⚠️ Could not request battery optimization exemption: $e');
    }

    debugPrint('✅ Permission request process completed');
    return true;
  }

  static Future<void> _requestBatteryOptimizationExemption() async {
    if (Platform.isAndroid) {
      try {
        final status = await Permission.ignoreBatteryOptimizations.status;
        if (status != PermissionStatus.granted) {
          debugPrint('🔋 Requesting battery optimization exemption...');
          await Permission.ignoreBatteryOptimizations.request();
        }
      } catch (e) {
        debugPrint('❌ Battery optimization request failed: $e');
      }
    }
  }

  static Future<bool> hasLocationPermission() async {
    return await Permission.location.isGranted;
  }

  static Future<bool> hasBackgroundLocationPermission() async {
    if (Platform.isAndroid) {
      return await Permission.locationAlways.isGranted;
    }
    return await Permission.location.isGranted;
  }

  static Future<bool> hasStoragePermission() async {
    if (Platform.isAndroid) {
      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;
      final sdkInt = androidInfo.version.sdkInt;

      if (sdkInt >= 30) {
        return await Permission.manageExternalStorage.isGranted;
      } else {
        return await Permission.storage.isGranted;
      }
    }
    return true; // iOS doesn't need explicit storage permission for app documents
  }

  static Future<bool> hasNotificationPermission() async {
    return await Permission.notification.isGranted;
  }

  static Future<bool> hasBluetoothPermission() async {
    if (Platform.isAndroid) {
      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;
      final sdkInt = androidInfo.version.sdkInt;

      if (sdkInt >= 31) {
        return await Permission.bluetoothScan.isGranted &&
            await Permission.bluetoothConnect.isGranted;
      } else {
        return await Permission.bluetooth.isGranted;
      }
    }
    return await Permission.bluetooth.isGranted;
  }

  static Future<void> openAppSettings() async {
    try {
      debugPrint('🔧 Opening app settings...');
      await permission_handler.openAppSettings();
    } catch (e) {
      debugPrint('❌ Failed to open app settings: $e');
    }
  }

  static Future<Map<String, bool>> getPermissionSummary() async {
    return {
      'location': await hasLocationPermission(),
      'backgroundLocation': await hasBackgroundLocationPermission(),
      'storage': await hasStoragePermission(),
      'notification': await hasNotificationPermission(),
      'bluetooth': await hasBluetoothPermission(),
      'camera': await Permission.camera.isGranted,
      'microphone': await Permission.microphone.isGranted,
      'sensors': await Permission.sensors.isGranted,
    };
  }

  // Add this method to your PermissionService class
  static Future<bool> requestStoragePermission() async {
    debugPrint('🔄 Explicitly requesting storage permission...');

    bool permissionGranted = false;

    try {
      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;
      final sdkInt = androidInfo.version.sdkInt;
      debugPrint('📱 Android SDK Version for storage: $sdkInt');

      if (sdkInt >= 33) {
        // Android 13+: Request granular media permissions
        debugPrint('📱 Android 13+ - Requesting media permissions');
        final photosStatus = await Permission.photos.request();
        permissionGranted = photosStatus.isGranted;
        debugPrint('📷 Photos permission: $photosStatus');
      } else if (sdkInt >= 30) {
        // Android 11+: Need MANAGE_EXTERNAL_STORAGE
        debugPrint('📱 Android 11+ - Requesting manage external storage');
        final status = await Permission.manageExternalStorage.request();
        permissionGranted = status.isGranted;
        debugPrint('📁 MANAGE_EXTERNAL_STORAGE: $status');

        if (status.isPermanentlyDenied) {
          debugPrint(
              '⚠️ Storage permission permanently denied - need app settings');
          return false;
        }
      } else {
        // Android 10 and below: Regular storage permission
        debugPrint('📱 Android 10 or below - Requesting regular storage');
        final status = await Permission.storage.request();
        permissionGranted = status.isGranted;
        debugPrint('📁 Storage permission: $status');

        if (status.isPermanentlyDenied) {
          debugPrint(
              '⚠️ Storage permission permanently denied - need app settings');
          return false;
        }
      }

      return permissionGranted;
    } catch (e) {
      debugPrint('❌ Error requesting storage permission: $e');
      return false;
    }
  }

  // Add this to check if storage permission is needed
  static Future<bool> isStoragePermissionPermanentlyDenied() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;
      final sdkInt = androidInfo.version.sdkInt;

      if (sdkInt >= 30) {
        return await Permission.manageExternalStorage.isPermanentlyDenied;
      } else {
        return await Permission.storage.isPermanentlyDenied;
      }
    } catch (e) {
      debugPrint('❌ Error checking permanent denial: $e');
      return false;
    }
  }
}
