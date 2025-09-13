// lib/services/enhanced_notification_service.dart

import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/models/notification_models.dart' as app_notification;
import 'package:mobile/services/api_client.dart';
import 'package:mobile/services/socket_service.dart';
import 'package:mobile/services/tracking_service.dart';

// Provider for the enhanced notification service
final enhancedNotificationServiceProvider =
    Provider<EnhancedNotificationService>((ref) {
  return EnhancedNotificationService(ref);
});

class EnhancedNotificationService {
  final ProviderRef _ref; // For future Riverpod integrations
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  final ApiClient _apiClient = ApiClient();
  final SocketService _socketService = SocketService();
  final TrackingService _trackingService = TrackingService();

  // Notification state management
  final ValueNotifier<List<app_notification.Notification>> notifications =
      ValueNotifier([]);
  final ValueNotifier<int> unreadCount = ValueNotifier(0);

  StreamSubscription? _notificationSubscription;
  bool _isInitialized = false;
  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;
  static const int maxReconnectAttempts = 5;

  // Navigation key for context access
  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();

  EnhancedNotificationService(this._ref);

  /// Initialize the enhanced notification service
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      await _initializeLocalNotifications();
      await _setupNotificationChannels();
      await _initializeSocketNotifications();

      _isInitialized = true;
      debugPrint('✅ Enhanced NotificationService initialized successfully');
    } catch (e) {
      debugPrint('❌ Failed to initialize Enhanced NotificationService: $e');
      _scheduleReconnect();
    }
  }

  /// Initialize Flutter Local Notifications
  Future<void> _initializeLocalNotifications() async {
    // Android initialization settings
    const androidInitialize =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    // iOS initialization settings
    const iosInitialize = DarwinInitializationSettings(
      requestSoundPermission: true,
      requestBadgePermission: true,
      requestAlertPermission: true,
    );

    const initializationSettings = InitializationSettings(
      android: androidInitialize,
      iOS: iosInitialize,
    );

    await _localNotifications.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: _onNotificationResponse,
    );

    // Request notification permissions for Android 13+
    await _requestNotificationPermissions();
  }

  /// Request notification permissions
  Future<void> _requestNotificationPermissions() async {
    if (defaultTargetPlatform == TargetPlatform.android) {
      final plugin = _localNotifications.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();

      await plugin?.requestNotificationsPermission();
      await plugin?.requestExactAlarmsPermission();
    }
  }

  /// Setup notification channels for different types
  Future<void> _setupNotificationChannels() async {
    const List<AndroidNotificationChannel> channels = [
      // High priority for trip confirmations
      AndroidNotificationChannel(
        'trip_confirmation',
        'Trip Confirmations',
        description:
            'Notifications requiring user confirmation for detected trips',
        importance: Importance.high,
        enableVibration: true,
        enableLights: true,
        ledColor: Color(0xFF2196F3),
        sound: RawResourceAndroidNotificationSound('trip_confirmation'),
      ),

      // Medium priority for completed trips
      AndroidNotificationChannel(
        'trip_completed',
        'Trip Completed',
        description: 'Notifications for automatically confirmed trips',
        importance: Importance.defaultImportance,
        enableVibration: true,
        sound: RawResourceAndroidNotificationSound('trip_completed'),
      ),

      // Low priority for general updates
      AndroidNotificationChannel(
        'general_updates',
        'General Updates',
        description: 'General app notifications and updates',
        importance: Importance.low,
        enableVibration: false,
      ),

      // High priority for permission issues
      AndroidNotificationChannel(
        'permission_alerts',
        'Permission Alerts',
        description: 'Important alerts about app permissions',
        importance: Importance.high,
        enableVibration: true,
        enableLights: true,
        ledColor: Color(0xFFFF5722),
      ),
    ];

    final plugin = _localNotifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();

    if (plugin != null) {
      for (final channel in channels) {
        await plugin.createNotificationChannel(channel);
      }
    }
  }

  /// Initialize socket-based real-time notifications
  Future<void> _initializeSocketNotifications() async {
    try {
      await _socketService.connect().timeout(const Duration(seconds: 8));
      await fetchNotifications().timeout(const Duration(seconds: 5));

      _notificationSubscription?.cancel();
      _notificationSubscription = _socketService.onNewNotification.listen(
        _handleNewNotification,
        onError: _handleNotificationError,
      );

      _reconnectAttempts = 0; // Reset on successful connection
    } catch (e) {
      debugPrint('Socket notification initialization failed: $e');
      // Don't rethrow - allow app to continue without real-time notifications
      _scheduleReconnect();
    }
  }

  /// Handle incoming real-time notifications
  void _handleNewNotification(dynamic data) async {
    try {
      final notificationData = _parseNotificationData(data);
      if (notificationData == null) return;

      final notification =
          app_notification.Notification.fromJson(notificationData);

      // Update in-app notification state
      _updateNotificationState(notification);

      // Show system notification
      await _showSystemNotification(notification);

      // Show in-app notification if app is active
      _showInAppNotification(notification);
    } catch (e) {
      debugPrint('Error handling new notification: $e');
    }
  }

  /// Parse notification data from various formats
  Map<String, dynamic>? _parseNotificationData(dynamic data) {
    try {
      if (data is String) {
        return jsonDecode(data) as Map<String, dynamic>;
      } else if (data is Map<String, dynamic>) {
        return data;
      } else {
        debugPrint('Unexpected notification data type: ${data.runtimeType}');
        return null;
      }
    } catch (e) {
      debugPrint('Error parsing notification data: $e');
      return null;
    }
  }

  /// Update in-app notification state
  void _updateNotificationState(app_notification.Notification notification) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      notifications.value = [notification, ...notifications.value];
      unreadCount.value++;
    });
  }

  /// Show system notification (appears in notification bar)
  Future<void> _showSystemNotification(
      app_notification.Notification notification) async {
    final notificationConfig =
        _getNotificationConfig(notification.type, notification.data);

    try {
      await _localNotifications.show(
        notification.id.hashCode, // Use notification ID as unique identifier
        notificationConfig.title,
        notificationConfig.body,
        notificationConfig.details,
        payload: jsonEncode({
          'id': notification.id,
          'type': notification.type,
          'data': notification.data,
        }),
      );
    } catch (e) {
      debugPrint('Error showing system notification: $e');
    }
  }

  /// Get notification configuration based on type
  NotificationConfig _getNotificationConfig(
      String type, Map<String, dynamic>? data) {
    switch (type) {
      case 'tripConfirmationRequired':
        return NotificationConfig(
          title: '🚶 Trip Confirmation Needed',
          body: _getTripConfirmationBody(data),
          details: NotificationDetails(
            android: AndroidNotificationDetails(
              'trip_confirmation',
              'Trip Confirmations',
              channelDescription: 'Notifications requiring user confirmation',
              importance: Importance.high,
              // priority: Priority.high,
              actions: _getTripConfirmationActions(data),
              category: AndroidNotificationCategory.event,
              fullScreenIntent: true,
            ),
            iOS: const DarwinNotificationDetails(
              categoryIdentifier: 'TRIP_CONFIRMATION',
              interruptionLevel: InterruptionLevel.active,
            ),
          ),
        );

      case 'tripCompleted':
        return NotificationConfig(
          title: '✅ Trip Completed',
          body: _getTripCompletedBody(data),
          details: NotificationDetails(
            android: AndroidNotificationDetails(
              'trip_completed',
              'Trip Completed',
              channelDescription: 'Notifications for completed trips',
              importance: Importance.defaultImportance,
              // priority: Priority.defaultPriority,
              category: AndroidNotificationCategory.status,
            ),
            iOS: const DarwinNotificationDetails(
              categoryIdentifier: 'TRIP_COMPLETED',
              interruptionLevel: InterruptionLevel.passive,
            ),
          ),
        );

      case 'permissionError':
        return NotificationConfig(
          title: '⚠️ Permission Required',
          body: data?['message'] ?? 'App permissions need attention',
          details: NotificationDetails(
            android: AndroidNotificationDetails(
              'permission_alerts',
              'Permission Alerts',
              channelDescription: 'Important permission alerts',
              importance: Importance.high,
              // priority: Priority.high,
              category: AndroidNotificationCategory.error,
              actions: [
                AndroidNotificationAction(
                  'open_settings',
                  'Open Settings',
                  icon: DrawableResourceAndroidBitmap('ic_settings'),
                ),
              ],
            ),
            iOS: const DarwinNotificationDetails(
              categoryIdentifier: 'PERMISSION_ALERT',
              interruptionLevel: InterruptionLevel.critical,
            ),
          ),
        );

      default:
        return NotificationConfig(
          title: 'WayMate',
          body: data?['message'] ?? 'New notification',
          details: NotificationDetails(
            android: AndroidNotificationDetails(
              'general_updates',
              'General Updates',
              channelDescription: 'General notifications',
              importance: Importance.low,
              // priority: Priority.low,
            ),
            iOS: const DarwinNotificationDetails(
              categoryIdentifier: 'GENERAL',
              interruptionLevel: InterruptionLevel.passive,
            ),
          ),
        );
    }
  }

  /// Get trip confirmation notification body
  String _getTripConfirmationBody(Map<String, dynamic>? data) {
    final mode = data?['detectedMode'] ?? 'unknown';
    final accuracy = data?['accuracy']?.toDouble() ?? 0.0;
    return 'We detected $mode travel (${accuracy.toStringAsFixed(0)}% confidence). Please confirm.';
  }

  /// Get trip completed notification body
  String _getTripCompletedBody(Map<String, dynamic>? data) {
    final mode = data?['mode'] ?? 'unknown';
    final accuracy = data?['accuracy']?.toDouble() ?? 0.0;
    return 'Detected as $mode travel with ${accuracy.toStringAsFixed(0)}% confidence.';
  }

  /// Get notification actions for trip confirmation
  List<AndroidNotificationAction> _getTripConfirmationActions(
      Map<String, dynamic>? data) {
    final detectedMode = data?['detectedMode'] ?? 'unknown';

    return [
      AndroidNotificationAction(
        'confirm_${detectedMode}',
        'Confirm $detectedMode',
        icon: DrawableResourceAndroidBitmap('ic_check'),
      ),
      AndroidNotificationAction(
        'choose_mode',
        'Choose Mode',
        icon: DrawableResourceAndroidBitmap('ic_edit'),
      ),
    ];
  }

  /// Handle notification response (when user taps notification)
  void _onNotificationResponse(NotificationResponse response) async {
    try {
      final payload = response.payload;
      if (payload == null) return;

      final data = jsonDecode(payload) as Map<String, dynamic>;
      final notificationType = data['type'] as String;
      final notificationData = data['data'] as Map<String, dynamic>?;

      await _handleNotificationAction(
          response.actionId, notificationType, notificationData);
    } catch (e) {
      debugPrint('Error handling notification response: $e');
    }
  }

  /// Handle notification actions
  Future<void> _handleNotificationAction(
    String? actionId,
    String notificationType,
    Map<String, dynamic>? data,
  ) async {
    switch (actionId) {
      case 'open_settings':
        // Open app settings for permissions
        break;

      case null: // Default tap action
        _navigateBasedOnNotificationType(notificationType, data);
        break;

      default:
        if (actionId.startsWith('confirm_')) {
          final mode = actionId.replaceFirst('confirm_', '');
          await _confirmTripFromNotification(data?['tripId'], mode);
        } else if (actionId == 'choose_mode') {
          _navigateToTripConfirmation(data?['tripId']);
        }
        break;
    }
  }

  /// Confirm trip directly from notification
  Future<void> _confirmTripFromNotification(String? tripId, String mode) async {
    if (tripId == null) return;

    try {
      await _trackingService.confirmTripMode(tripId, mode);

      // Show success notification
      await _localNotifications.show(
        DateTime.now().millisecondsSinceEpoch,
        'Trip Confirmed',
        'Trip confirmed as $mode travel. Thank you!',
        NotificationDetails(
          android: AndroidNotificationDetails(
            'trip_completed',
            'Trip Completed',
            importance: Importance.low,
            // priority: Priority.low,
          ),
        ),
      );
    } catch (e) {
      debugPrint('Error confirming trip from notification: $e');
    }
  }

  /// Navigate based on notification type
  void _navigateBasedOnNotificationType(
      String type, Map<String, dynamic>? data) {
    final context = navigatorKey.currentContext;
    if (context == null) return;

    switch (type) {
      case 'tripConfirmationRequired':
        _navigateToTripConfirmation(data?['tripId']);
        break;
      case 'tripCompleted':
        _navigateToTripDetails(data?['tripId']);
        break;
      default:
        // Navigate to notifications screen
        break;
    }
  }

  /// Navigate to trip confirmation screen
  void _navigateToTripConfirmation(String? tripId) {
    // TODO: Implement navigation to trip confirmation
    debugPrint('Navigate to trip confirmation for: $tripId');
  }

  /// Navigate to trip details screen
  void _navigateToTripDetails(String? tripId) {
    // TODO: Implement navigation to trip details
    debugPrint('Navigate to trip details for: $tripId');
  }

  /// Show in-app notification when app is active
  void _showInAppNotification(app_notification.Notification notification) {
    // Use existing in-app notification logic
    final context = navigatorKey.currentContext;
    if (context != null) {
      // Show in-app toast or dialog
    }
  }

  /// Handle notification stream errors
  void _handleNotificationError(dynamic error) {
    debugPrint('Notification stream error: $error');
    _scheduleReconnect();
  }

  /// Schedule reconnection with exponential backoff
  void _scheduleReconnect() {
    if (_reconnectAttempts >= maxReconnectAttempts) {
      debugPrint('Max reconnection attempts reached');
      return;
    }

    _reconnectTimer?.cancel();
    final delay = Duration(seconds: (2 << _reconnectAttempts).clamp(2, 30));
    _reconnectAttempts++;

    debugPrint(
        'Scheduling notification reconnect in ${delay.inSeconds}s (attempt $_reconnectAttempts)');

    _reconnectTimer = Timer(delay, () async {
      try {
        await _initializeSocketNotifications();
      } catch (e) {
        debugPrint('Reconnection failed: $e');
        _scheduleReconnect();
      }
    });
  }

  /// Fetch notifications from server
  Future<void> fetchNotifications() async {
    try {
      final response = await _apiClient.get('notifications');
      final notificationsData = response['notifications'];

      if (notificationsData == null) {
        notifications.value = [];
        unreadCount.value = 0;
        return;
      }

      final notificationList = (notificationsData as List)
          .map((json) => app_notification.Notification.fromJson(json))
          .toList();

      notifications.value = notificationList;
      unreadCount.value = notificationList.where((n) => !n.isRead).length;
    } catch (e) {
      debugPrint('Error fetching notifications: $e');
    }
  }

  /// Mark notification as read
  Future<void> markAsRead(String notificationId) async {
    try {
      await _apiClient
          .patch('notifications/$notificationId', body: {'read': true});

      // Update local state
      final currentNotifications = notifications.value;
      final updatedNotifications = currentNotifications.map((n) {
        if (n.id == notificationId) {
          return app_notification.Notification(
            id: n.id,
            user: n.user,
            message: n.message,
            type: n.type,
            link: n.link,
            tripId: n.tripId,
            priority: n.priority,
            read: true,
            createdAt: n.createdAt,
            data: n.data,
          );
        }
        return n;
      }).toList();

      notifications.value = updatedNotifications;
      unreadCount.value = updatedNotifications.where((n) => !n.isRead).length;
    } catch (e) {
      debugPrint('Error marking notification as read: $e');
    }
  }

  /// Clear all notifications
  Future<void> clearAllNotifications() async {
    await _localNotifications.cancelAll();
    notifications.value = [];
    unreadCount.value = 0;
  }

  // === PUBLIC NOTIFICATION METHODS ===

  /// Show trip confirmation notification
  Future<void> showTripConfirmationNotification({
    required String tripId,
    required String detectedMode,
    required double accuracy,
    Map<String, dynamic>? data,
  }) async {
    final notification = app_notification.Notification(
      id: 'trip_confirmation_$tripId',
      user: 'system',
      message:
          'We detected a $detectedMode trip with ${accuracy.toStringAsFixed(1)}% confidence',
      type: 'trip_confirmation_request',
      tripId: tripId,
      priority: 'high',
      read: false,
      createdAt: DateTime.now(),
    );

    await _showSystemNotification(notification);
    _showInAppNotification(notification);
    _updateNotificationState(notification);
  }

  /// Show trip completed notification
  Future<void> showTripCompletedNotification({
    required String tripId,
    required String mode,
    required double distance,
    required Duration duration,
    Map<String, dynamic>? data,
  }) async {
    final notification = app_notification.Notification(
      id: 'trip_completed_$tripId',
      user: 'system',
      message:
          '$mode trip: ${distance.toStringAsFixed(1)}km in ${duration.inMinutes}min',
      type: 'trip_completed',
      tripId: tripId,
      priority: 'medium',
      read: false,
      createdAt: DateTime.now(),
    );

    await _showSystemNotification(notification);
    _showInAppNotification(notification);
    _updateNotificationState(notification);
  }

  /// Show permission error notification
  Future<void> showPermissionErrorNotification({
    required List<String> missingPermissions,
    Map<String, dynamic>? data,
  }) async {
    final notification = app_notification.Notification(
      id: 'permission_error_${DateTime.now().millisecondsSinceEpoch}',
      user: 'system',
      message: 'Missing permissions: ${missingPermissions.join(', ')}',
      type: 'permission_error',
      priority: 'high',
      read: false,
      createdAt: DateTime.now(),
    );

    await _showSystemNotification(notification);
    _showInAppNotification(notification);
    _updateNotificationState(notification);
  }

  /// Show general notification
  Future<void> showGeneralNotification({
    required String title,
    required String message,
    Map<String, dynamic>? data,
  }) async {
    final notification = app_notification.Notification(
      id: 'general_${DateTime.now().millisecondsSinceEpoch}',
      user: 'system',
      message: message,
      type: 'general_update',
      priority: 'low',
      read: false,
      createdAt: DateTime.now(),
    );

    await _showSystemNotification(notification);
    _showInAppNotification(notification);
    _updateNotificationState(notification);
  }

  // === END PUBLIC METHODS ===

  /// Dispose resources
  void dispose() {
    _notificationSubscription?.cancel();
    _reconnectTimer?.cancel();
    notifications.dispose();
    unreadCount.dispose();
  }
}

/// Configuration class for notifications
class NotificationConfig {
  final String title;
  final String body;
  final NotificationDetails details;

  NotificationConfig({
    required this.title,
    required this.body,
    required this.details,
  });
}
