// lib/providers.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/services/notification_service.dart';
import 'package:mobile/services/enhanced_notification_service.dart';
import 'package:mobile/services/passive_tracking_manager.dart';
import 'package:mobile/services/sensor_service.dart';
import 'package:mobile/services/ml_service.dart';
import 'package:mobile/services/socket_service.dart';
import 'package:mobile/services/auth_service.dart';
import 'package:mobile/services/notification_handler.dart';

// --- AUTH ---
final authServiceProvider = Provider((ref) => AuthService());

// --- SOCKET ---
final socketServiceProvider = Provider((ref) => SocketService());

// --- NOTIFICATION HANDLER ---
final notificationHandlerProvider = Provider((ref) => NotificationHandler());

// --- NOTIFICATION ---
final notificationServiceProvider = Provider((ref) => NotificationService());

// --- ENHANCED NOTIFICATION ---
final enhancedNotificationServiceProvider =
    Provider((ref) => EnhancedNotificationService(ref));

// --- PASSIVE TRACKING ---
final sensorServiceProvider = Provider((ref) => SensorService());
final mlServiceProvider = Provider((ref) => MLService());

// Provider for the main tracking manager
final passiveTrackingManagerProvider = Provider((ref) {
  // This ensures that the other services are available when the manager is created.
  ref.watch(sensorServiceProvider);
  ref.watch(mlServiceProvider);
  return PassiveTrackingManager();
});
