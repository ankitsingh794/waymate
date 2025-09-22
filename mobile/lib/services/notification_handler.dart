import 'dart:async';
import 'package:mobile/models/notification_models.dart';
import 'package:mobile/services/socket_service.dart';
import 'package:mobile/utils/logger.dart';

/// Comprehensive notification handler that manages all types of notifications
/// from the socket service and provides a unified interface for the UI
class NotificationHandler {
  static final NotificationHandler _instance = NotificationHandler._internal();
  factory NotificationHandler() => _instance;
  NotificationHandler._internal();

  final SocketService _socketService = SocketService();

  // Stream controllers for different notification categories
  final _generalNotificationController =
      StreamController<Notification>.broadcast();
  final _tripNotificationController =
      StreamController<TripStatusNotification>.broadcast();
  final _alertNotificationController =
      StreamController<TravelAlert>.broadcast();
  final _confirmationNotificationController =
      StreamController<TripConfirmationNotification>.broadcast();

  // Public streams
  Stream<Notification> get onGeneralNotification =>
      _generalNotificationController.stream;
  Stream<TripStatusNotification> get onTripNotification =>
      _tripNotificationController.stream;
  Stream<TravelAlert> get onTravelAlert => _alertNotificationController.stream;
  Stream<TripConfirmationNotification> get onTripConfirmation =>
      _confirmationNotificationController.stream;

  // Combined stream for all notifications
  final _allNotificationsController =
      StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get onAllNotifications =>
      _allNotificationsController.stream;

  List<StreamSubscription> _subscriptions = [];
  bool _isInitialized = false;

  /// Initialize all notification listeners
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      logger.i("🔔 Initializing NotificationHandler");

      // Listen to all socket notification streams
      _subscriptions.addAll([
        _socketService.onNewNotification.listen(_handleGeneralNotification),
        _socketService.onTripConfirmed.listen(_handleTripConfirmed),
        _socketService.onTripConfirmationRequired
            .listen(_handleTripConfirmationRequired),
        _socketService.onTripCompleted.listen(_handleTripCompleted),
        _socketService.onNewTravelAlert.listen(_handleTravelAlert),
        _socketService.onProactiveTravelAlert
            .listen(_handleProactiveTravelAlert),
        _socketService.onStatusUpdate.listen(_handleStatusUpdate),
        _socketService.onTripCreated.listen(_handleTripCreated),
      ]);

      _isInitialized = true;
      logger.i("✅ NotificationHandler initialized successfully");
    } catch (e, s) {
      logger.e("❌ Failed to initialize NotificationHandler",
          error: e, stackTrace: s);
    }
  }

  /// Handle general notifications
  void _handleGeneralNotification(Map<String, dynamic> data) {
    try {
      logger.i("🔔 Processing general notification: $data");

      final notification = Notification.fromJson(data);
      _generalNotificationController.add(notification);

      // Also add to combined stream
      _allNotificationsController.add({
        'type': 'general',
        'data': data,
        'timestamp': DateTime.now().toIso8601String(),
      });

      _logNotification('General Notification', data);
    } catch (e, s) {
      logger.e("❌ Error processing general notification",
          error: e, stackTrace: s);
    }
  }

  /// Handle trip confirmed notifications
  void _handleTripConfirmed(Map<String, dynamic> data) {
    try {
      logger.i("📋 Processing trip confirmed notification: $data");

      final notification =
          TripStatusNotification.fromJson({...data, 'status': 'confirmed'});
      _tripNotificationController.add(notification);

      _allNotificationsController.add({
        'type': 'tripConfirmed',
        'data': data,
        'timestamp': DateTime.now().toIso8601String(),
      });

      _logNotification('Trip Confirmed', data);
    } catch (e, s) {
      logger.e("❌ Error processing trip confirmed notification",
          error: e, stackTrace: s);
    }
  }

  /// Handle trip confirmation required notifications
  void _handleTripConfirmationRequired(Map<String, dynamic> data) {
    try {
      logger.i("❓ Processing trip confirmation required: $data");

      final notification = TripConfirmationNotification.fromJson(data);
      _confirmationNotificationController.add(notification);

      _allNotificationsController.add({
        'type': 'tripConfirmationRequired',
        'data': data,
        'timestamp': DateTime.now().toIso8601String(),
      });

      _logNotification('Trip Confirmation Required', data);
    } catch (e, s) {
      logger.e("❌ Error processing trip confirmation required",
          error: e, stackTrace: s);
    }
  }

  /// Handle trip completed notifications
  void _handleTripCompleted(Map<String, dynamic> data) {
    try {
      logger.i("✅ Processing trip completed notification: $data");

      final notification =
          TripStatusNotification.fromJson({...data, 'status': 'completed'});
      _tripNotificationController.add(notification);

      _allNotificationsController.add({
        'type': 'tripCompleted',
        'data': data,
        'timestamp': DateTime.now().toIso8601String(),
      });

      _logNotification('Trip Completed', data);
    } catch (e, s) {
      logger.e("❌ Error processing trip completed notification",
          error: e, stackTrace: s);
    }
  }

  /// Handle travel alert notifications
  void _handleTravelAlert(Map<String, dynamic> data) {
    try {
      logger.w("⚠️ Processing travel alert: $data");

      final alert = TravelAlert.fromJson({...data, 'type': 'travel_alert'});
      _alertNotificationController.add(alert);

      _allNotificationsController.add({
        'type': 'travelAlert',
        'data': data,
        'timestamp': DateTime.now().toIso8601String(),
      });

      _logNotification('Travel Alert', data);
    } catch (e, s) {
      logger.e("❌ Error processing travel alert", error: e, stackTrace: s);
    }
  }

  /// Handle proactive travel alert notifications
  void _handleProactiveTravelAlert(Map<String, dynamic> data) {
    try {
      logger.w("🚨 Processing proactive travel alert: $data");

      final alert = TravelAlert.fromJson({...data, 'type': 'proactive_alert'});
      _alertNotificationController.add(alert);

      _allNotificationsController.add({
        'type': 'proactiveTravelAlert',
        'data': data,
        'timestamp': DateTime.now().toIso8601String(),
      });

      _logNotification('Proactive Travel Alert', data);
    } catch (e, s) {
      logger.e("❌ Error processing proactive travel alert",
          error: e, stackTrace: s);
    }
  }

  /// Handle status update notifications
  void _handleStatusUpdate(Map<String, dynamic> data) {
    try {
      logger.i("📊 Processing status update: $data");

      _allNotificationsController.add({
        'type': 'statusUpdate',
        'data': data,
        'timestamp': DateTime.now().toIso8601String(),
      });

      _logNotification('Status Update', data);
    } catch (e, s) {
      logger.e("❌ Error processing status update", error: e, stackTrace: s);
    }
  }

  /// Handle trip created notifications
  void _handleTripCreated(Map<String, dynamic> data) {
    try {
      logger.i("🆕 Processing trip created: $data");

      final notification =
          TripStatusNotification.fromJson({...data, 'status': 'created'});
      _tripNotificationController.add(notification);

      _allNotificationsController.add({
        'type': 'tripCreated',
        'data': data,
        'timestamp': DateTime.now().toIso8601String(),
      });

      _logNotification('Trip Created', data);
    } catch (e, s) {
      logger.e("❌ Error processing trip created", error: e, stackTrace: s);
    }
  }

  /// Helper method to log notifications consistently
  void _logNotification(String type, Map<String, dynamic> data) {
    final message = data['message'] ?? 'No message';
    final tripId = data['tripId'] ?? 'N/A';
    logger.i("📬 $type | TripID: $tripId | Message: $message");
  }

  /// Get notification count by type (for UI badges)
  int getNotificationCount(NotificationType type) {
    // This would typically be connected to a local storage/database
    // For now, return 0 as a placeholder
    return 0;
  }

  /// Mark notification as read
  Future<void> markAsRead(String notificationId) async {
    try {
      logger.d("Marking notification as read: $notificationId");
      // Implementation would depend on your backend API
    } catch (e, s) {
      logger.e("❌ Error marking notification as read", error: e, stackTrace: s);
    }
  }

  /// Clear all notifications of a specific type
  void clearNotifications(NotificationType type) {
    logger.i("Clearing notifications of type: ${type.eventName}");
    // Implementation would clear local storage and update UI
  }

  /// Dispose all streams and subscriptions
  void dispose() {
    logger.d("Disposing NotificationHandler");

    for (final subscription in _subscriptions) {
      subscription.cancel();
    }
    _subscriptions.clear();

    _generalNotificationController.close();
    _tripNotificationController.close();
    _alertNotificationController.close();
    _confirmationNotificationController.close();
    _allNotificationsController.close();

    _isInitialized = false;
  }
}
