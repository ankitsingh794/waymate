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
  });

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
      );
    } catch (e) {
      debugPrint('Error parsing Notification from JSON: $e');
      rethrow;
    }
  }
}
