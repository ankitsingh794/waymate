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
