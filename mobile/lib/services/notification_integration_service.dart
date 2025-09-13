// lib/services/notification_integration_service.dart

import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:mobile/services/socket_service.dart';

/// Service that integrates notifications between server and mobile app
class NotificationIntegrationService {
  static NotificationIntegrationService? _instance;
  static NotificationIntegrationService get instance =>
      _instance ??= NotificationIntegrationService._();

  NotificationIntegrationService._();

  final SocketService _socketService = SocketService();

  StreamSubscription? _notificationSubscription;
  bool _isInitialized = false;

  /// Initialize the notification integration service
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      debugPrint('🔄 Initializing notification integration service...');

      // Initialize socket service with timeout
      await _socketService.connect().timeout(const Duration(seconds: 8));

      // Start listening for notifications
      _startListening();

      _isInitialized = true;
      debugPrint('✅ Notification integration service initialized');
    } catch (e) {
      debugPrint('❌ Failed to initialize notification integration service: $e');
      // Don't rethrow - allow app to continue without real-time notifications
    }
  }

  /// Start listening for notifications from server
  void _startListening() {
    _notificationSubscription = _socketService.onNewNotification.listen(
      (data) async {
        try {
          await _handleIncomingNotification(data);
        } catch (e) {
          debugPrint('❌ Error handling incoming notification: $e');
        }
      },
      onError: (error) {
        debugPrint('❌ Notification stream error: $error');
      },
    );

    debugPrint('👂 Started listening for notifications');
  }

  /// Handle incoming notification from server
  Future<void> _handleIncomingNotification(dynamic data) async {
    try {
      final notificationData = _parseNotificationData(data);
      if (notificationData == null) {
        debugPrint('⚠️ Invalid notification data received');
        return;
      }

      debugPrint('📱 Processing notification: ${notificationData['type']}');

      switch (notificationData['type']) {
        case 'trip_confirmation_request':
          await _handleTripConfirmationRequest(notificationData);
          break;

        case 'trip_completed':
          await _handleTripCompleted(notificationData);
          break;

        case 'permission_error':
          await _handlePermissionError(notificationData);
          break;

        case 'general_update':
          await _handleGeneralUpdate(notificationData);
          break;

        default:
          debugPrint(
              '⚠️ Unknown notification type: ${notificationData['type']}');
          await _handleGeneralUpdate(notificationData);
      }
    } catch (e) {
      debugPrint('❌ Error processing notification: $e');
    }
  }

  /// Handle trip confirmation request notification
  Future<void> _handleTripConfirmationRequest(Map<String, dynamic> data) async {
    final tripId = data['tripId'] as String?;
    final detectedMode = data['detectedMode'] as String?;
    final accuracy = data['accuracy'] as double?;

    if (tripId == null || detectedMode == null) {
      debugPrint('⚠️ Missing required data for trip confirmation');
      return;
    }

    // Create notification directly (simplified approach)
    debugPrint(
        '📱 Trip confirmation notification: $detectedMode trip detected (${accuracy?.toStringAsFixed(1)}% accuracy)');
  }

  /// Handle trip completed notification
  Future<void> _handleTripCompleted(Map<String, dynamic> data) async {
    final tripId = data['tripId'] as String?;
    final mode = data['mode'] as String?;

    if (tripId == null) {
      debugPrint('⚠️ Missing tripId for trip completed notification');
      return;
    }

    // Create notification directly (simplified approach)
    debugPrint('📱 Trip completed notification: $mode trip completed');
  }

  /// Handle permission error notification
  Future<void> _handlePermissionError(Map<String, dynamic> data) async {
    final missingPermissions = data['missingPermissions'] as List<dynamic>?;

    // Create notification directly (simplified approach)
    debugPrint(
        '📱 Permission error notification: Missing ${missingPermissions?.join(', ')}');
  }

  /// Handle general update notification
  Future<void> _handleGeneralUpdate(Map<String, dynamic> data) async {
    final title = data['title'] as String? ?? 'WayMate Update';
    final message = data['message'] as String? ?? 'You have a new update';

    // Create notification directly (simplified approach)
    debugPrint('📱 General notification: $title - $message');
  }

  /// Parse notification data from various formats
  Map<String, dynamic>? _parseNotificationData(dynamic data) {
    try {
      if (data is String) {
        return jsonDecode(data) as Map<String, dynamic>;
      } else if (data is Map<String, dynamic>) {
        return data;
      } else if (data is Map) {
        return Map<String, dynamic>.from(data);
      }
    } catch (e) {
      debugPrint('❌ Error parsing notification data: $e');
    }
    return null;
  }

  /// Send confirmation response back to server
  Future<void> sendTripConfirmation({
    required String tripId,
    required String confirmedMode,
    required bool userConfirmed,
  }) async {
    try {
      _socketService.emit('trip_confirmation_response', {
        'tripId': tripId,
        'confirmedMode': confirmedMode,
        'userConfirmed': userConfirmed,
        'timestamp': DateTime.now().toIso8601String(),
      });

      debugPrint('✅ Trip confirmation sent: $tripId - $confirmedMode');
    } catch (e) {
      debugPrint('❌ Failed to send trip confirmation: $e');
    }
  }

  /// Send notification acknowledgment back to server
  Future<void> acknowledgeNotification({
    required String notificationId,
    required String action,
  }) async {
    try {
      _socketService.emit('notification_acknowledged', {
        'notificationId': notificationId,
        'action': action,
        'timestamp': DateTime.now().toIso8601String(),
      });

      debugPrint('✅ Notification acknowledged: $notificationId - $action');
    } catch (e) {
      debugPrint('❌ Failed to acknowledge notification: $e');
    }
  }

  /// Request permission refresh from server
  Future<void> requestPermissionRefresh() async {
    try {
      _socketService.emit('permission_refresh_request', {
        'timestamp': DateTime.now().toIso8601String(),
      });

      debugPrint('✅ Permission refresh requested');
    } catch (e) {
      debugPrint('❌ Failed to request permission refresh: $e');
    }
  }

  /// Check connection status
  bool get isConnected => _socketService.isConnected;

  /// Dispose the service
  void dispose() {
    _notificationSubscription?.cancel();
    _notificationSubscription = null;
    _socketService.dispose();
    _isInitialized = false;

    debugPrint('🗑️ Notification integration service disposed');
  }
}

/// Notification action types
enum NotificationAction {
  confirm,
  edit,
  dismiss,
  settings,
  view,
}

extension NotificationActionExtension on NotificationAction {
  String get id {
    switch (this) {
      case NotificationAction.confirm:
        return 'confirm';
      case NotificationAction.edit:
        return 'edit';
      case NotificationAction.dismiss:
        return 'dismiss';
      case NotificationAction.settings:
        return 'settings';
      case NotificationAction.view:
        return 'view';
    }
  }

  String get label {
    switch (this) {
      case NotificationAction.confirm:
        return 'Confirm';
      case NotificationAction.edit:
        return 'Edit';
      case NotificationAction.dismiss:
        return 'Dismiss';
      case NotificationAction.settings:
        return 'Settings';
      case NotificationAction.view:
        return 'View';
    }
  }
}
