import 'package:flutter/foundation.dart';

class Feedback {
  final String id;
  final String? userId;
  final String name;
  final String email;
  final String message;
  final String? reply;
  final String? repliedBy;
  final String type;
  final String? tripId;
  final int? rating;
  final String status;
  final String? sentiment;

  Feedback({
    required this.id,
    this.userId,
    required this.name,
    required this.email,
    required this.message,
    this.reply,
    this.repliedBy,
    required this.type,
    this.tripId,
    this.rating,
    required this.status,
    this.sentiment,
  });

  factory Feedback.fromJson(Map<String, dynamic> json) {
    try {
      return Feedback(
        id: json['_id'],
        userId: json['userId'],
        name: json['name'],
        email: json['email'],
        message: json['message'],
        reply: json['reply'],
        repliedBy: json['repliedBy'],
        type: json['type'],
        tripId: json['tripId'],
        rating: json['rating'],
        status: json['status'],
        sentiment: json['sentiment'],
      );
    } catch (e) {
      debugPrint('Error parsing Feedback from JSON: $e');
      rethrow;
    }
  }
}
