import 'package:flutter/foundation.dart';

class Notification {
  final String id;
  final String user;
  final String message;
  final String type;
  final String? link;
  final String? tripId;
  final String priority;
  final bool read;
  final DateTime createdAt;
  final Map<String, dynamic>? data;

  Notification({
    required this.id,
    required this.user,
    required this.message,
    required this.type,
    this.link,
    this.tripId,
    required this.priority,
    required this.read,
    required this.createdAt,
    this.data,
  });

  /// Getter for backward compatibility
  bool get isRead => read;

  factory Notification.fromJson(Map<String, dynamic> json) {
    try {
      return Notification(
        id: json['_id'],
        user: json['user'],
        message: json['message'],
        type: json['type'],
        link: json['link'],
        tripId: json['tripId'],
        priority: json['priority'],
        read: json['read'],
        createdAt: DateTime.parse(json['createdAt']),
        data: json['data'] as Map<String, dynamic>?,
      );
    } catch (e) {
      debugPrint('Error parsing Notification from JSON: $e');
      rethrow;
    }
  }

  /// Create a copy with updated fields
  Notification copyWith({
    String? id,
    String? user,
    String? message,
    String? type,
    String? link,
    String? tripId,
    String? priority,
    bool? read,
    DateTime? createdAt,
    Map<String, dynamic>? data,
  }) {
    return Notification(
      id: id ?? this.id,
      user: user ?? this.user,
      message: message ?? this.message,
      type: type ?? this.type,
      link: link ?? this.link,
      tripId: tripId ?? this.tripId,
      priority: priority ?? this.priority,
      read: read ?? this.read,
      createdAt: createdAt ?? this.createdAt,
      data: data ?? this.data,
    );
  }
}

/// Specific notification models for different notification types

class TripConfirmationNotification {
  final String tripId;
  final String message;
  final Map<String, dynamic>? tripData;
  final DateTime timestamp;

  TripConfirmationNotification({
    required this.tripId,
    required this.message,
    this.tripData,
    required this.timestamp,
  });

  factory TripConfirmationNotification.fromJson(Map<String, dynamic> json) {
    return TripConfirmationNotification(
      tripId: json['tripId'] ?? '',
      message: json['message'] ?? '',
      tripData: json['tripData'] as Map<String, dynamic>?,
      timestamp: DateTime.now(),
    );
  }
}

class TravelAlert {
  final String alertId;
  final String message;
  final String type; // weather, delay, traffic, etc.
  final String? tripId;
  final String priority; // low, medium, high, critical
  final Map<String, dynamic>? alertData;
  final DateTime timestamp;

  TravelAlert({
    required this.alertId,
    required this.message,
    required this.type,
    this.tripId,
    required this.priority,
    this.alertData,
    required this.timestamp,
  });

  factory TravelAlert.fromJson(Map<String, dynamic> json) {
    return TravelAlert(
      alertId: json['alertId'] ??
          json['id'] ??
          DateTime.now().millisecondsSinceEpoch.toString(),
      message: json['message'] ?? '',
      type: json['type'] ?? 'general',
      tripId: json['tripId'],
      priority: json['priority'] ?? 'medium',
      alertData: json['data'] as Map<String, dynamic>?,
      timestamp: DateTime.now(),
    );
  }
}

class TripStatusNotification {
  final String tripId;
  final String status; // confirmed, completed, cancelled, etc.
  final String message;
  final Map<String, dynamic>? statusData;
  final DateTime timestamp;

  TripStatusNotification({
    required this.tripId,
    required this.status,
    required this.message,
    this.statusData,
    required this.timestamp,
  });

  factory TripStatusNotification.fromJson(Map<String, dynamic> json) {
    return TripStatusNotification(
      tripId: json['tripId'] ?? '',
      status: json['status'] ?? 'unknown',
      message: json['message'] ?? '',
      statusData: json['data'] as Map<String, dynamic>?,
      timestamp: DateTime.now(),
    );
  }
}

/// Enum for notification types to help with type safety
enum NotificationType {
  newMessage,
  newNotification,
  tripConfirmed,
  tripConfirmationRequired,
  tripCompleted,
  newTravelAlert,
  proactiveTravelAlert,
  statusUpdate,
  tripCreated,
}

extension NotificationTypeExtension on NotificationType {
  String get eventName {
    switch (this) {
      case NotificationType.newMessage:
        return 'newMessage';
      case NotificationType.newNotification:
        return 'newNotification';
      case NotificationType.tripConfirmed:
        return 'tripConfirmed';
      case NotificationType.tripConfirmationRequired:
        return 'tripConfirmationRequired';
      case NotificationType.tripCompleted:
        return 'tripCompleted';
      case NotificationType.newTravelAlert:
        return 'newTravelAlert';
      case NotificationType.proactiveTravelAlert:
        return 'proactiveTravelAlert';
      case NotificationType.statusUpdate:
        return 'statusUpdate';
      case NotificationType.tripCreated:
        return 'tripCreated';
    }
  }
}
