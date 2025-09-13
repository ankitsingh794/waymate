// lib/services/background_service_manager.dart

import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:workmanager/workmanager.dart';
import 'package:mobile/services/socket_service.dart';

/// Background service manager for handling notifications when app is closed
class BackgroundServiceManager {
  static const String _notificationCheckTask = 'notification_check_task';
  static const String _tripTrackingTask = 'trip_tracking_task';

  static BackgroundServiceManager? _instance;
  static BackgroundServiceManager get instance =>
      _instance ??= BackgroundServiceManager._();

  BackgroundServiceManager._();

  /// Initialize background services
  Future<void> initialize() async {
    try {
      await Workmanager().initialize(
        callbackDispatcher,
        isInDebugMode: kDebugMode,
      );

      debugPrint('✅ Background service manager initialized');
    } catch (e) {
      debugPrint('❌ Failed to initialize background service manager: $e');
    }
  }

  /// Start periodic notification checking
  Future<void> startNotificationChecking() async {
    try {
      await Workmanager().registerPeriodicTask(
        _notificationCheckTask,
        _notificationCheckTask,
        frequency: const Duration(minutes: 15), // Check every 15 minutes
        constraints: Constraints(
          networkType: NetworkType.connected,
          requiresBatteryNotLow: false,
          requiresCharging: false,
          requiresDeviceIdle: false,
          requiresStorageNotLow: false,
        ),
        backoffPolicy: BackoffPolicy.exponential,
        backoffPolicyDelay: const Duration(seconds: 30),
      );

      debugPrint('✅ Notification checking background task registered');
    } catch (e) {
      debugPrint('❌ Failed to register notification checking task: $e');
    }
  }

  /// Start background trip tracking
  Future<void> startTripTracking() async {
    try {
      await Workmanager().registerPeriodicTask(
        _tripTrackingTask,
        _tripTrackingTask,
        frequency: const Duration(minutes: 5), // Check every 5 minutes
        constraints: Constraints(
          networkType: NetworkType.connected,
          requiresBatteryNotLow: false,
          requiresCharging: false,
          requiresDeviceIdle: false,
          requiresStorageNotLow: false,
        ),
        backoffPolicy: BackoffPolicy.exponential,
        backoffPolicyDelay: const Duration(seconds: 15),
      );

      debugPrint('✅ Trip tracking background task registered');
    } catch (e) {
      debugPrint('❌ Failed to register trip tracking task: $e');
    }
  }

  /// Stop all background tasks
  Future<void> stopAllTasks() async {
    try {
      await Workmanager().cancelAll();
      debugPrint('✅ All background tasks cancelled');
    } catch (e) {
      debugPrint('❌ Failed to cancel background tasks: $e');
    }
  }

  /// Stop specific task
  Future<void> stopTask(String taskName) async {
    try {
      await Workmanager().cancelByUniqueName(taskName);
      debugPrint('✅ Background task $taskName cancelled');
    } catch (e) {
      debugPrint('❌ Failed to cancel background task $taskName: $e');
    }
  }
}

/// Background callback dispatcher - runs in isolate
@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    try {
      debugPrint('🔄 Background task started: $task');

      switch (task) {
        case 'notification_check_task':
          await _handleNotificationCheck(inputData);
          break;

        case 'trip_tracking_task':
          await _handleTripTracking(inputData);
          break;

        default:
          debugPrint('❓ Unknown background task: $task');
          return false;
      }

      debugPrint('✅ Background task completed: $task');
      return true;
    } catch (e) {
      debugPrint('❌ Background task failed: $task - $e');
      return false;
    }
  });
}

/// Handle notification checking in background
Future<void> _handleNotificationCheck(Map<String, dynamic>? inputData) async {
  try {
    // Initialize minimal services needed for notifications
    final socketService = SocketService();

    // Check for pending notifications
    await socketService.connect();

    // Listen for incoming notifications with timeout
    final completer = Completer<void>();
    Timer(const Duration(seconds: 30), () {
      if (!completer.isCompleted) {
        completer.complete();
      }
    });

    final subscription = socketService.onNewNotification.listen((data) async {
      try {
        final notificationData = _parseNotificationData(data);
        if (notificationData != null) {
          await _showBackgroundNotification(notificationData);
        }
      } catch (e) {
        debugPrint('Error handling background notification: $e');
      }
    });

    await completer.future;
    await subscription.cancel();
    socketService.dispose();
  } catch (e) {
    debugPrint('Error in background notification check: $e');
  }
}

/// Handle trip tracking in background
Future<void> _handleTripTracking(Map<String, dynamic>? inputData) async {
  try {
    // Basic trip tracking logic for background
    // This would check for ongoing trips and sync data
    debugPrint('🚗 Background trip tracking check completed');
  } catch (e) {
    debugPrint('Error in background trip tracking: $e');
  }
}

/// Parse notification data
Map<String, dynamic>? _parseNotificationData(dynamic data) {
  try {
    if (data is String) {
      return jsonDecode(data) as Map<String, dynamic>;
    } else if (data is Map<String, dynamic>) {
      return data;
    }
  } catch (e) {
    debugPrint('Error parsing background notification data: $e');
  }
  return null;
}

/// Show notification in background using minimal setup
Future<void> _showBackgroundNotification(Map<String, dynamic> data) async {
  try {
    // This would use a minimal notification setup
    // Since we're in a background isolate, we need to be careful about dependencies
    debugPrint('📱 Would show background notification: ${data['message']}');

    // Note: In a real implementation, you'd use flutter_local_notifications
    // directly here with minimal setup, but that requires careful isolate handling
  } catch (e) {
    debugPrint('Error showing background notification: $e');
  }
}

/// Notification type configuration for background
enum BackgroundNotificationType {
  tripConfirmation,
  tripCompleted,
  permissionError,
  general,
}

/// Background notification configuration
class BackgroundNotificationConfig {
  final BackgroundNotificationType type;
  final String title;
  final String body;
  final Map<String, dynamic>? data;
  final bool requiresAction;
  final Duration? timeout;

  const BackgroundNotificationConfig({
    required this.type,
    required this.title,
    required this.body,
    this.data,
    this.requiresAction = false,
    this.timeout,
  });
}
