import 'dart:async';
import 'package:mobile/services/api_client.dart';
import 'package:mobile/models/household_models.dart';


// --- Service Class ---

class HouseholdService {
  final ApiClient _apiClient = ApiClient();

  /// Creates a new household for the current user.
  Future<Household> createHousehold(String householdName) async {
    final response = await _apiClient.post(
      'households',
      body: {'householdName': householdName},
    );
    return Household.fromJson(response['data']['household']);
  }

  /// Fetches the details of the user's current household.
  Future<Household?> getMyHouseholdDetails() async {
     final response = await _apiClient.get('households/my-household');
     if (response['data']['household'] == null) {
       return null;
     }
     return Household.fromJson(response['data']['household']);
  }

  /// Updates household's name.
  Future<Household> updateHousehold(String householdId, String newName) async {
      final response = await _apiClient.patch(
          'households/$householdId',
          body: {'householdName': newName},
      );
      return Household.fromJson(response['data']['household']);
  }

  /// Generates an invitation link (as the household head).
  Future<String> generateInviteLink(String householdId) async {
     final response = await _apiClient.post('households/$householdId/generate-invite');
     return response['data']['inviteLink'];
  }

  /// Accepts an invitation to join a household using a token.
  Future<void> acceptHouseholdInvite(String token) async {
    await _apiClient.post(
      'households/accept-invite',
      body: {'token': token},
    );
  }

  /// Removes a member from the household (as the household head).
  Future<void> removeMember(String householdId, String memberId) async {
    await _apiClient.delete('households/$householdId/members/$memberId');
  }

  /// Updates a member's details (role and/or relationship).
  Future<Household> updateMemberDetails(String householdId, String memberId, {String? role, String? relationship}) async {
      final Map<String, String> body = {};
      if (role != null) body['role'] = role;
      if (relationship != null) body['relationship'] = relationship;

      final response = await _apiClient.patch(
          'households/$householdId/members/$memberId',
          body: body,
      );
      return Household.fromJson(response['data']['household']);
  }

  /// Submits or updates the household's survey data.
  Future<Household> submitSurvey(String householdId, SurveyData surveyData) async {
      final response = await _apiClient.patch(
          'households/$householdId/survey',
          body: surveyData.toJson(),
      );
      return Household.fromJson(response['data']['household']);
  }
}
