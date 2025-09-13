// lib/services/notification_service.dart

import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_styled_toast/flutter_styled_toast.dart';
import 'package:mobile/models/notification_models.dart' as app_notification;
import 'package:mobile/services/api_client.dart';
import 'package:mobile/services/socket_service.dart';

// ✅ ADDED: The missing provider that creates and provides the NotificationService.
// Your main.dart file needs this to be able to read the service.
final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService(ref);
});

class NotificationService {
  // ✅ CHANGED: It's good practice to make the 'ref' private.
  final ProviderRef _ref; // For future Riverpod integrations
  NotificationService(this._ref);

  final ApiClient _apiClient = ApiClient();
  final SocketService _socketService = SocketService();

  final ValueNotifier<List<app_notification.Notification>> notifications =
      ValueNotifier([]);
  final ValueNotifier<int> unreadCount = ValueNotifier(0);

  StreamSubscription? _notificationSubscription;
  bool _isInitialized = false;

  // FIX: Make navigator key accessible
  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();

  /// Initializes the service with proper error handling and smooth flow
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // FIX: Ensure socket connection is established before listening
      // You can use your private _ref here to read other services if needed
      // For example: final socketService = _ref.read(socketServiceProvider);
      await _socketService.connect();

      // Fetch initial notifications
      await fetchNotifications();

      // FIX: Cancel any existing subscription
      _notificationSubscription?.cancel();

      // Listen for real-time notifications
      _notificationSubscription = _socketService.onNewNotification.listen(
        _handleNewNotification,
        onError: (error) {
          debugPrint('Notification stream error: $error');
          // FIX: Attempt to reconnect on error
          _reconnectNotifications();
        },
      );

      _isInitialized = true;
      debugPrint('✅ NotificationService initialized successfully');
    } catch (e) {
      debugPrint('❌ Failed to initialize NotificationService: $e');
      // FIX: Retry initialization after delay
      Timer(const Duration(seconds: 3), () => initialize());
    }
  }

  /// Handles incoming notifications with proper error handling
  void _handleNewNotification(dynamic data) {
    try {
      Map<String, dynamic> notificationJson;

      if (data is String) {
        try {
          notificationJson = jsonDecode(data);
        } catch (e) {
          debugPrint('Error decoding notification JSON string: $e');
          return;
        }
      } else if (data is Map<String, dynamic>) {
        notificationJson = data;
      } else {
        debugPrint(
            'Received notification data of unexpected type: ${data.runtimeType}');
        return;
      }

      final newNotification =
          app_notification.Notification.fromJson(notificationJson);

      // FIX: Update state on main thread
      WidgetsBinding.instance.addPostFrameCallback((_) {
        notifications.value = [newNotification, ...notifications.value];
        unreadCount.value++;

        // FIX: Show notification with proper context check
        _showNotificationSafely(newNotification);
      });
    } catch (e) {
      debugPrint('Error handling new notification: $e');
    }
  }

  /// Safely shows notification popup with fallback options
  void _showNotificationSafely(app_notification.Notification notification) {
    final context = navigatorKey.currentContext;
    if (context == null) {
      debugPrint('No context available for notification popup');
      return;
    }

    try {
      // FIX: Show styled toast notification
      _showStyledToast(context, notification);
    } catch (e) {
      debugPrint('Error showing notification popup: $e');
      // FIX: Last resort - try SnackBar
      try {
        _showSnackBarNotification(context, notification);
      } catch (e2) {
        debugPrint('Failed to show any notification: $e2');
      }
    }
  }

  /// Shows styled toast notification
  void _showStyledToast(
      BuildContext context, app_notification.Notification notification) {
    showToastWidget(
      GestureDetector(
        onTap: () => _handleNotificationTap(notification),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: _getNotificationColor(notification.type),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Icon(
                _getNotificationIcon(notification.type),
                color: Colors.white,
                size: 24,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _getNotificationTitle(notification.type),
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      notification.message,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.9),
                        fontSize: 13,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const Icon(Icons.touch_app, color: Colors.white70, size: 16),
            ],
          ),
        ),
      ),
      context: context,
      animation: StyledToastAnimation.slideFromTop,
      position: StyledToastPosition.top,
      duration: const Duration(seconds: 4),
      isHideKeyboard: false,
    );
  }

  /// Fallback SnackBar notification
  void _showSnackBarNotification(
      BuildContext context, app_notification.Notification notification) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(_getNotificationIcon(notification.type), color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text(notification.message)),
          ],
        ),
        backgroundColor: _getNotificationColor(notification.type),
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        action: notification.link != null
            ? SnackBarAction(
                label: 'View',
                textColor: Colors.white,
                onPressed: () => _handleNotificationTap(notification),
              )
            : null,
      ),
    );
  }

  /// Handle notification tap for navigation
  void _handleNotificationTap(app_notification.Notification notification) {
    final context = navigatorKey.currentContext;
    if (context == null) return;

    // FIX: Navigate based on notification type
    if (notification.tripId != null) {
      Navigator.pushNamed(
        context,
        '/trip-details',
        arguments: {'tripId': notification.tripId},
      );
    } else if (notification.link != null) {
      // Handle other link types
      debugPrint('Navigating to: ${notification.link}');
    }
  }

  /// Get notification color based on type
  Color _getNotificationColor(String type) {
    switch (type) {
      case 'trip':
        return Colors.green.shade700;
      case 'alert':
        return Colors.red.shade700;
      case 'group':
        return Colors.blue.shade700;
      default:
        return Colors.blueGrey.shade700;
    }
  }

  /// Get notification icon based on type
  IconData _getNotificationIcon(String type) {
    switch (type) {
      case 'trip':
        return Icons.travel_explore;
      case 'alert':
        return Icons.warning;
      case 'group':
        return Icons.group;
      default:
        return Icons.notifications;
    }
  }

  /// Get notification title based on type
  String _getNotificationTitle(String type) {
    switch (type) {
      case 'trip':
        return 'Trip Update';
      case 'alert':
        return 'Alert';
      case 'group':
        return 'Group Message';
      default:
        return 'Notification';
    }
  }

  /// Reconnect notifications on error
  void _reconnectNotifications() {
    debugPrint('Attempting to reconnect notifications...');
    Timer(const Duration(seconds: 2), () async {
      try {
        await _socketService.connect();
        _notificationSubscription = _socketService.onNewNotification.listen(
          _handleNewNotification,
          onError: (error) => _reconnectNotifications(),
        );
        debugPrint('✅ Notifications reconnected');
      } catch (e) {
        debugPrint('❌ Reconnection failed: $e');
        _reconnectNotifications(); // Retry
      }
    });
  }

  /// Fetches notifications with retry logic
  Future<void> fetchNotifications({int retryCount = 0}) async {
    try {
      final response = await _apiClient.get('notifications');
      if (response == null || response['data'] == null) {
        debugPrint("No data found in notifications response.");
        return;
      }

      final responseData = response['data'];
      final notificationsData = responseData['notifications'];

      if (notificationsData == null) {
        notifications.value = [];
        unreadCount.value = 0;
        debugPrint("Notifications data is null, setting empty list");
        return;
      }

      final notificationsJson = notificationsData as List;

      final fetchedNotifications = notificationsJson
          .map((json) => app_notification.Notification.fromJson(json))
          .toList();

      notifications.value = fetchedNotifications;
      unreadCount.value = fetchedNotifications.where((n) => !n.read).length;

      debugPrint('✅ Fetched ${fetchedNotifications.length} notifications');
    } catch (e) {
      debugPrint("Failed to fetch notifications: $e");

      // FIX: Retry on failure (max 3 attempts)
      if (retryCount < 3) {
        Timer(Duration(seconds: (retryCount + 1) * 2), () {
          fetchNotifications(retryCount: retryCount + 1);
        });
      }
    }
  }

  /// Marks all notifications as read
  Future<void> markAllAsRead() async {
    try {
      await _apiClient.post('notifications/mark-all-read');

      final updatedList =
          notifications.value.map((n) => n.copyWith(read: true)).toList();
      notifications.value = updatedList;
      unreadCount.value = 0;
    } catch (e) {
      debugPrint("Failed to mark notifications as read: $e");
    }
  }

  void dispose() {
    _notificationSubscription?.cancel();
    _isInitialized = false;
  }
}

// Helper extension for copyWith
extension NotificationCopyWith on app_notification.Notification {
  app_notification.Notification copyWith({bool? read}) {
    return app_notification.Notification(
      id: id,
      user: user,
      message: message,
      type: type,
      link: link,
      tripId: tripId,
      priority: priority,
      read: read ?? this.read,
      createdAt: createdAt,
    );
  }
}
