import 'package:flutter/foundation.dart';

class HouseholdMember {
  final String userId;
  final String role;
  final String relationship;

  HouseholdMember({
    required this.userId,
    required this.role,
    required this.relationship,
  });

  factory HouseholdMember.fromJson(Map<String, dynamic> json) {
    return HouseholdMember(
      userId: json['userId'],
      role: json['role'],
      relationship: json['relationship'],
    );
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
    return SurveyData(
      vehicleOwnership: json['vehicleOwnership'] ?? 0,
      householdSize: json['householdSize'],
      incomeRange: json['incomeRange'],
      lastUpdated: json['lastUpdated'] != null ? DateTime.parse(json['lastUpdated']) : null,
    );
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
      return Household(
        id: json['_id'],
        householdName: json['householdName'],
        anonymizedId: json['anonymizedId'],
        members: (json['members'] as List)
            .map((m) => HouseholdMember.fromJson(m))
            .toList(),
        surveyData: json['surveyData'] != null
            ? SurveyData.fromJson(json['surveyData'])
            : null,
      );
    } catch (e) {
      debugPrint('Error parsing Household from JSON: $e');
      rethrow;
    }
  }
}
