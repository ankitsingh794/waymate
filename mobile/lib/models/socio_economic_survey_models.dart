// models/socio_economic_survey_model.dart

import 'package:flutter/foundation.dart';

@immutable
class SocioEconomicSurvey {
  final String? id;
  final String? userId;
  final String? householdIncome;
  final int? vehicleCount;
  final String? primaryTransportModeToWork;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const SocioEconomicSurvey({
    this.id,
    this.userId,
    this.householdIncome,
    this.vehicleCount,
    this.primaryTransportModeToWork,
    this.createdAt,
    this.updatedAt,
  });

  /// An empty survey object, useful for initial state.
  static const empty = SocioEconomicSurvey();

  /// Creates a Survey object from a JSON map.
  factory SocioEconomicSurvey.fromJson(Map<String, dynamic> json) {
    return SocioEconomicSurvey(
      id: json['_id'] as String?,
      userId: json['userId'] as String?,
      householdIncome: json['householdIncome'] as String?,
      vehicleCount: json['vehicleCount'] as int?,
      primaryTransportModeToWork: json['primaryTransportModeToWork'] as String?,
      // Safely parse date strings, handles null values.
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt']) : null,
    );
  }

  /// Converts the Survey object to a JSON map.
  /// This is essential for sending data to the API in POST/PUT requests.
  Map<String, dynamic> toJson() {
    return {
      'householdIncome': householdIncome,
      'vehicleCount': vehicleCount,
      'primaryTransportModeToWork': primaryTransportModeToWork,
    };
  }

  /// Creates a copy of the instance with updated fields.
  /// This is a best practice for managing state immutably in Flutter.
  SocioEconomicSurvey copyWith({
    String? id,
    String? userId,
    String? householdIncome,
    int? vehicleCount,
    String? primaryTransportModeToWork,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return SocioEconomicSurvey(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      householdIncome: householdIncome ?? this.householdIncome,
      vehicleCount: vehicleCount ?? this.vehicleCount,
      primaryTransportModeToWork: primaryTransportModeToWork ?? this.primaryTransportModeToWork,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}