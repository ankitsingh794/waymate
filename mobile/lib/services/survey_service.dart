// services/survey_service.dart

import 'dart:convert';
import 'package:mobile/services/api_client.dart';
import 'package:mobile/models/socio_economic_survey_models.dart';

class SurveyService {
  final ApiClient _apiClient = ApiClient();

  /// Fetches the current user's survey data.
  /// Returns a [SocioEconomicSurvey] object if found, otherwise returns null.
  Future<SocioEconomicSurvey?> getMySurveyData() async {
    try {
      final response = await _apiClient.get('surveys/my-data');
      final responseBody = json.decode(response.body);

      if (response.statusCode == 200) {
        final data = responseBody['data'];
        if (data == null) {
          return null;
        }
        return SocioEconomicSurvey.fromJson(data);
      } else {
        throw ApiException(
          responseBody['message'] ?? 'Failed to fetch survey data',
          response.statusCode,
        );
      }
    } on ApiException {
      rethrow; // Rethrow known API exceptions directly.
    } catch (e) {
      // Catch any other errors (e.g., network issues) and wrap them.
      throw ApiException('An unexpected error occurred: ${e.toString()}');
    }
  }

  /// Submits or updates the current user's survey data.
  /// Returns the updated survey data from the server.
  Future<SocioEconomicSurvey> submitOrUpdateSurveyData(SocioEconomicSurvey data) async {
    try {
      final response = await _apiClient.post(
        'surveys/my-data',
        body: data.toJson(), // Use the newly added toJson() method.
      );
      
      final responseBody = json.decode(response.body);

      if (response.statusCode == 200) {
        // Return the updated data from the response for immediate UI updates.
        return SocioEconomicSurvey.fromJson(responseBody['data']);
      } else {
        throw ApiException(
          responseBody['message'] ?? 'Failed to update survey data',
          response.statusCode,
        );
      }
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('An unexpected error occurred: ${e.toString()}');
    }
  }
}