import 'package:flutter/foundation.dart';
import 'package:isar/isar.dart';

part 'user_model.g.dart';

@embedded
class UserPreferences {
  late String language;
  late String currency;

  // FIX: Add constructor with defaults
  UserPreferences({
    this.language = 'en',
    this.currency = 'INR',
  });

  factory UserPreferences.fromJson(Map<String, dynamic> json) {
    return UserPreferences(
      language: json['language'] ?? 'en',
      currency: json['currency'] ?? 'INR',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'language': language,
      'currency': currency,
    };
  }
}

@embedded
class UserLocation {
  String? city;
  String? country;
  List<double>? coordinates;

  // FIX: Add constructor
  UserLocation({
    this.city,
    this.country,
    this.coordinates,
  });

  factory UserLocation.fromJson(Map<String, dynamic> json) {
    return UserLocation()
      ..city = json['city']
      ..country = json['country']
      ..coordinates = json['point']?['coordinates'] != null
          ? List<double>.from(
              json['point']['coordinates'].map((c) => (c as num).toDouble()))
          : null;
  }

  Map<String, dynamic> toJson() {
    return {
      'city': city,
      'country': country,
      'point': coordinates != null
          ? {'type': 'Point', 'coordinates': coordinates}
          : null,
    };
  }
}

@embedded
class ConsentEntry {
  late String key;
  late String status;
  late DateTime updatedAt;

  ConsentEntry({
    this.key = '',
    this.status = 'revoked',
  }) : updatedAt = DateTime.now();

  factory ConsentEntry.fromJson(String key, Map<String, dynamic> json) {
    return ConsentEntry(
      key: key,
      status: json['status'] ?? 'revoked',
    )..updatedAt =
        DateTime.parse(json['updatedAt'] ?? DateTime.now().toIso8601String());
  }

  Map<String, dynamic> toJson() {
    return {
      'status': status,
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

@embedded
class User {
  late String id;
  late String name;
  late String email;
  late String role;
  late String accountStatus;
  late bool isEmailVerified;
  String? profileImage;
  UserPreferences? preferences;
  UserLocation? location;
  late List<String> favoriteTrips;
  String? householdId;
  DateTime? passwordChangedAt;
  // ADD: Consents field - changed from Map to List for Isar compatibility
  late List<ConsentEntry> consents;
  late String? anonymizedHash;

  // FIX: Add constructor with optional parameters
  User({
    this.id = '',
    this.name = '',
    this.email = '',
    this.role = 'user',
    this.accountStatus = 'pending',
    this.isEmailVerified = false,
    this.profileImage,
    UserPreferences? preferences,
    this.location,
    this.favoriteTrips = const [],
    this.householdId,
    this.passwordChangedAt,
    this.consents = const [],
    this.anonymizedHash,
  }) : preferences = preferences ?? UserPreferences();

  factory User.fromJson(Map<String, dynamic> json) {
    try {
      return User(
        id: json['_id'] ?? '',
        name: json['name'] ?? '',
        email: json['email'] ?? '',
        role: json['role'] ?? 'user',
        accountStatus: json['accountStatus'] ?? 'pending',
        isEmailVerified: json['isEmailVerified'] ?? false,
        profileImage: json['profileImage'],
        preferences: UserPreferences.fromJson(json['preferences'] ?? {}),
        location: json['location'] != null
            ? UserLocation.fromJson(json['location'])
            : null,
        favoriteTrips: List<String>.from(json['favoriteTrips'] ?? []),
        householdId: json['householdId'],
        passwordChangedAt: json['passwordChangedAt'] != null
            ? DateTime.parse(json['passwordChangedAt'])
            : null,
        consents: _parseConsents(json['consents']),
        anonymizedHash: json['anonymizedHash'],
      );
    } catch (e) {
      debugPrint('Error parsing User from JSON: $e');
      rethrow;
    }
  }

  static List<ConsentEntry> _parseConsents(dynamic consentsJson) {
    if (consentsJson == null) return [];

    final List<ConsentEntry> consents = [];

    for (final entry in (consentsJson as Map<String, dynamic>).entries) {
      consents.add(ConsentEntry.fromJson(entry.key, entry.value));
    }

    return consents;
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'email': email,
      'role': role,
      'accountStatus': accountStatus,
      'isEmailVerified': isEmailVerified,
      'profileImage': profileImage,
      'preferences': preferences?.toJson(),
      'location': location?.toJson(),
      'favoriteTrips': favoriteTrips,
      'householdId': householdId,
      'passwordChangedAt': passwordChangedAt?.toIso8601String(),
      'consents': {for (var entry in consents) entry.key: entry.toJson()},
      'anonymizedHash': anonymizedHash,
    };
  }

  // Helper methods for consent
  String getConsent(String consentType) {
    final entry = consents.firstWhere(
      (entry) => entry.key == consentType,
      orElse: () => ConsentEntry(key: consentType, status: 'revoked'),
    );
    return entry.status;
  }

  bool hasConsent(String consentType) {
    return getConsent(consentType) == 'granted';
  }

  // Create a copy with updated consent (for setState)
  User copyWithConsent(String consentType, String status) {
    final newConsents = List<ConsentEntry>.from(consents);

    // Remove existing consent entry for this type
    newConsents.removeWhere((entry) => entry.key == consentType);

    // Add new consent entry
    final newEntry = ConsentEntry(
      key: consentType,
      status: status,
    );
    newEntry.updatedAt = DateTime.now();
    newConsents.add(newEntry);

    return User(
      id: id,
      name: name,
      email: email,
      role: role,
      accountStatus: accountStatus,
      isEmailVerified: isEmailVerified,
      profileImage: profileImage,
      preferences: preferences,
      location: location,
      favoriteTrips: favoriteTrips,
      householdId: householdId,
      passwordChangedAt: passwordChangedAt,
      consents: newConsents,
      anonymizedHash: anonymizedHash,
    );
  }

  // ... rest of existing methods
}
