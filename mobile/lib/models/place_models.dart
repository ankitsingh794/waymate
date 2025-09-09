import 'package:flutter/foundation.dart';
import 'package:mobile/models/trip_models.dart'; // For Coordinates

class Place {
  final String id;
  final String query;
  final String city;
  final String name;
  final String? address;
  final double? rating;
  final String? reason;
  final String? placeId;
  final String? imageUrl;
  final Coordinates location;

  Place({
    required this.id,
    required this.query,
    required this.city,
    required this.name,
    this.address,
    this.rating,
    this.reason,
    this.placeId,
    this.imageUrl,
    required this.location,
  });

  factory Place.fromJson(Map<String, dynamic> json) {
    try {
      return Place(
        id: json['_id'],
        query: json['query'],
        city: json['city'],
        name: json['name'],
        address: json['address'],
        rating: (json['rating'] as num?)?.toDouble(),
        reason: json['reason'],
        placeId: json['place_id'],
        imageUrl: json['imageUrl'],
        location: Coordinates.fromJson(json['location']['coordinates']),
      );
    } catch (e) {
      debugPrint('Error parsing Place from JSON: $e');
      rethrow;
    }
  }
}
