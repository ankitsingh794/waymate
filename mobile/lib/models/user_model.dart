import 'package:flutter/foundation.dart';

class UserPreferences {
  final String language;
  final String currency;

  UserPreferences({required this.language, required this.currency});

  factory UserPreferences.fromJson(Map<String, dynamic> json) {
    return UserPreferences(
      language: json['language'] ?? 'en',
      currency: json['currency'] ?? 'INR',
    );
  }
}

class UserLocation {
  final String? city;
  final String? country;
  final List<double>? coordinates; // [longitude, latitude]

  UserLocation({this.city, this.country, this.coordinates});

  factory UserLocation.fromJson(Map<String, dynamic> json) {
    return UserLocation(
      city: json['city'],
      country: json['country'],
      coordinates: json['point']?['coordinates'] != null
          ? List<double>.from(json['point']['coordinates'].map((c) => (c as num).toDouble()))
          : null,
    );
  }
}

class User {
  final String id;
  final String name;
  final String email;
  final String role;
  final String accountStatus;
  final bool isEmailVerified;
  final String? profileImage;
  final UserPreferences preferences;
  final UserLocation? location;
  final List<String> favoriteTrips;
  final String? householdId;
  final DateTime? passwordChangedAt;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.accountStatus,
    required this.isEmailVerified,
    this.profileImage,
    required this.preferences,
    this.location,
    required this.favoriteTrips,
    this.householdId,
    this.passwordChangedAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    try {
      return User(
        id: json['_id'],
        name: json['name'],
        email: json['email'],
        role: json['role'] ?? 'user',
        accountStatus: json['accountStatus'] ?? 'pending',
        isEmailVerified: json['isEmailVerified'] ?? false,
        profileImage: json['profileImage'],
        preferences: UserPreferences.fromJson(json['preferences'] ?? {}),
        location:
            json['location'] != null ? UserLocation.fromJson(json['location']) : null,
        favoriteTrips: List<String>.from(json['favoriteTrips'] ?? []),
        householdId: json['householdId'],
        passwordChangedAt: json['passwordChangedAt'] != null
            ? DateTime.parse(json['passwordChangedAt'])
            : null,
      );
    } catch (e) {
      debugPrint('Error parsing User from JSON: $e');
      rethrow;
    }
  }
}

