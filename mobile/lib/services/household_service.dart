// lib/services/household_service.dart

import 'dart:async';
import 'package:mobile/services/api_client.dart';
import 'package:mobile/models/household_models.dart';

class HouseholdService {
  final ApiClient _apiClient = ApiClient();

  /// Creates a new household for the current user.
  /// Corresponds to: POST /api/households
  Future<Household> createHousehold(String householdName) async {
    final response = await _apiClient.post(
      'households',
      body: {'householdName': householdName},
    );
    return Household.fromJson(response['data']['household']);
  }

  /// Fetches the details of the user's current household, including all members.
  /// Corresponds to: GET /api/households/my-household
  Future<Household?> getMyHouseholdDetails() async {
     final response = await _apiClient.get('households/my-household');
     if (response['data']['household'] == null) {
       return null;
     }
     return Household.fromJson(response['data']['household']);
  }

  /// Updates a household's name.
  /// Corresponds to: PATCH /api/households/:id
  Future<Household> updateHousehold(String householdId, String newName) async {
      final response = await _apiClient.patch(
          'households/$householdId',
          body: {'householdName': newName},
      );
      return Household.fromJson(response['data']['household']);
  }
  
  /// Deletes the entire household.
  /// Corresponds to: DELETE /api/households/:id
  Future<void> deleteHousehold(String householdId) async {
    await _apiClient.delete('households/$householdId');
  }

  /// Generates an invitation link (as the household head).
  /// Corresponds to: POST /api/households/:id/generate-invite
  Future<String> generateInviteLink(String householdId) async {
     final response = await _apiClient.post('households/$householdId/generate-invite');
     return response['data']['inviteLink'];
  }

  /// Accepts an invitation to join a household using a token.
  /// Corresponds to: POST /api/households/accept-invite
  Future<void> acceptHouseholdInvite(String token) async {
    await _apiClient.post(
      'households/accept-invite',
      body: {'token': token},
    );
  }
  
  /// The current user leaves their household.
  /// Corresponds to: POST /api/households/:id/leave
  Future<void> leaveHousehold(String householdId) async {
    await _apiClient.post('households/$householdId/leave');
  }

  /// Removes a member from the household (as the household head).
  /// Corresponds to: DELETE /api/households/:id/members/:memberId
  Future<void> removeMember(String householdId, String memberId) async {
    await _apiClient.delete('households/$householdId/members/$memberId');
  }

  /// Updates a member's details (role and/or relationship).
  /// Corresponds to: PATCH /api/households/:id/members/:memberId
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
  /// Corresponds to: PATCH /api/households/:id/survey
  Future<Household> submitSurvey(String householdId, SurveyData surveyData) async {
      final response = await _apiClient.patch(
          'households/$householdId/survey',
          body: surveyData.toJson(),
      );
      return Household.fromJson(response['data']['household']);
  }
}