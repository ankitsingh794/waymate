// lib/services/survey_service.dart

import 'package:mobile/services/api_client.dart';
import 'package:mobile/models/socio_economic_survey_models.dart';

class SurveyService {
  final ApiClient _apiClient = ApiClient();

  Future<SocioEconomicSurvey?> getMySurveyData() async {
    try {
      final response = await _apiClient.get('surveys/my-data');

      final data = response['data'];
      if (data == null) {
        return null;
      }
      return SocioEconomicSurvey.fromJson(data);
    } on ApiException {
      rethrow; 
    } catch (e) {
      throw ApiException('An unexpected error occurred while fetching survey data.');
    }
  }

  /// Submits or updates the current user's survey data.
  /// Returns the updated survey data from the server.
  Future<SocioEconomicSurvey> submitOrUpdateSurveyData(SocioEconomicSurvey data) async {
    try {
      final response = await _apiClient.post(
        'surveys/my-data',
        body: data.toJson(),
      );
      
      return SocioEconomicSurvey.fromJson(response['data']);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('An unexpected error occurred while updating survey data.');
    }
  }
}