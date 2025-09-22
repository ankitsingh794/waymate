import 'package:flutter/foundation.dart';
import 'package:mobile/models/user_model.dart';

class HouseholdMember {
  final User user;
  final String role;
  final String relationship;

  HouseholdMember({
    required this.user,
    required this.role,
    required this.relationship,
  });

  factory HouseholdMember.fromJson(Map<String, dynamic> json) {
    try {
      // Handle both 'user' and 'userId' keys since server populates 'userId'
      final userData = json['user'] ?? json['userId'];
      if (userData == null) {
        throw FormatException('Missing user data in HouseholdMember JSON');
      }

      return HouseholdMember(
        user: User.fromJson(userData as Map<String, dynamic>),
        role: json['role'] ?? '',
        relationship: json['relationship'] ?? 'other',
      );
    } catch (e) {
      debugPrint('Error parsing HouseholdMember from JSON: $e');
      debugPrint('JSON data: $json');
      rethrow;
    }
  }
}

// household_models.dart

class SurveyData {
  final int vehicleOwnership;
  final int? householdSize;
  final String? incomeRange;
  final DateTime? lastUpdated;

  SurveyData({
    required this.vehicleOwnership,
    this.householdSize,
    this.incomeRange,
    this.lastUpdated,
  });

  factory SurveyData.fromJson(Map<String, dynamic> json) {
    try {
      return SurveyData(
        vehicleOwnership: json['vehicleOwnership'] ?? 0,
        householdSize: json['householdSize'],
        incomeRange: json['incomeRange'],
        lastUpdated: json['lastUpdated'] != null
            ? DateTime.tryParse(json['lastUpdated'])
            : null,
      );
    } catch (e) {
      debugPrint('Error parsing SurveyData from JSON: $e');
      debugPrint('JSON data: $json');
      rethrow;
    }
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = {
      'vehicleOwnership': vehicleOwnership,
    };
    if (householdSize != null) {
      data['householdSize'] = householdSize;
    }
    if (incomeRange != null) {
      data['incomeRange'] = incomeRange;
    }
    return data;
  }
}

class Household {
  final String id;
  final String householdName;
  final String anonymizedId;
  final List<HouseholdMember> members;
  final SurveyData? surveyData;

  Household({
    required this.id,
    required this.householdName,
    required this.anonymizedId,
    required this.members,
    this.surveyData,
  });

  factory Household.fromJson(Map<String, dynamic> json) {
    try {
      // Validate required fields
      if (json['_id'] == null || json['householdName'] == null) {
        throw FormatException('Missing required fields in Household JSON');
      }

      return Household(
        id: json['_id'],
        householdName: json['householdName'],
        anonymizedId: json['anonymizedId'] ?? '',
        members: json['members'] != null
            ? (json['members'] as List)
                .map((m) => m is Map<String, dynamic>
                    ? HouseholdMember.fromJson(m)
                    : null)
                .whereType<HouseholdMember>()
                .toList()
            : [],
        surveyData: json['surveyData'] != null
            ? SurveyData.fromJson(json['surveyData'])
            : null,
      );
    } catch (e) {
      debugPrint('Error parsing Household from JSON: $e');
      debugPrint('JSON data: $json');
      rethrow;
    }
  }
}
