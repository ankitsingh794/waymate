import 'package:flutter/foundation.dart';
import 'package:mobile/models/trip_models.dart'; // For Coordinates

class Alert {
  final String id;
  final String type;
  final String title;
  final String? description;
  final String severity;
  final String source;
  final String? link;
  final Coordinates location;
  final String? tripId;
  final DateTime postedAt;
  final DateTime? expiresAt;

  Alert({
    required this.id,
    required this.type,
    required this.title,
    this.description,
    required this.severity,
    required this.source,
    this.link,
    required this.location,
    this.tripId,
    required this.postedAt,
    this.expiresAt,
  });

  factory Alert.fromJson(Map<String, dynamic> json) {
    try {
      return Alert(
        id: json['_id'],
        type: json['type'],
        title: json['title'],
        description: json['description'],
        severity: json['severity'],
        source: json['source'],
        link: json['link'],
        location: Coordinates.fromJson(json['location']['coordinates']),
        tripId: json['tripId'],
        postedAt: DateTime.parse(json['postedAt']),
        expiresAt: json['expiresAt'] != null ? DateTime.parse(json['expiresAt']) : null,
      );
    } catch (e) {
      debugPrint('Error parsing Alert from JSON: $e');
      rethrow;
    }
  }
}
