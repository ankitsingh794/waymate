import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:mobile/services/api_client.dart';
import 'package:mobile/models/user_model.dart';

// --- Service Class (Refactored for Production Readiness) ---

class UserService {
  final ApiClient _apiClient = ApiClient();

  /// Fetches the complete profile for the currently authenticated user.
  Future<User> getUserProfile() async {
    try {
      debugPrint('🔄 UserService: Getting user profile...');

      final response = await _apiClient.get('users/profile');

      if (response != null && response['success'] == true) {
        debugPrint('✅ UserService: Profile loaded successfully');
        return User.fromJson(response['data']);
      } else {
        debugPrint('❌ UserService: Invalid response format');
        debugPrint('Response: $response');
        throw ApiException('Invalid response from server');
      }
    } on ApiException {
      debugPrint('❌ UserService: API Exception caught, rethrowing');
      rethrow;
    } catch (e) {
      debugPrint('❌ UserService: Unexpected error: $e');
      throw ApiException('Failed to load profile: ${e.toString()}');
    }
  }

  /// Updates user profile details. Only non-null values will be sent.
  Future<User> updateUserProfile({
    String? name,
    String? language,
    String? currency,
    String? city,
    String? country,
  }) async {
    try {
      final Map<String, dynamic> body = {};
      if (name != null) body['name'] = name;
      if (language != null || currency != null) {
        body['preferences'] = {
          if (language != null) 'language': language,
          if (currency != null) 'currency': currency,
        };
      }
      if (city != null || country != null) {
        body['location'] = {
          if (city != null) 'city': city,
          if (country != null) 'country': country,
        };
      }

      final responseData = await _apiClient.patch('/users/profile', body: body);
      return User.fromJson(responseData['data']['user']);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
          'An unexpected error occurred while updating your profile.');
    }
  }

  /// Uploads a new profile photo for the user.
  Future<User> uploadProfilePhoto(File imageFile) async {
    try {
      final responseData = await _apiClient.patchWithFile(
        '/users/profile/photo',
        file: imageFile,
        fileField: 'photo',
      );
      return User.fromJson(responseData['data']['user']);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
          'An unexpected error occurred while uploading the photo.');
    }
  }

  /// Updates the user's live geo-location.
  Future<void> updateUserLocation(
      {required double latitude, required double longitude}) async {
    try {
      await _apiClient.patch(
        '/users/profile/location',
        body: {'lat': latitude, 'lon': longitude},
      );
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
          'An unexpected error occurred while updating location.');
    }
  }

  /// Records the user's consent status for a specific feature.
  Future<void> updateUserConsent(
      {required String consentType, required String status}) async {
    try {
      // Ensure status is either 'granted' or 'revoked' before sending
      if (status != 'granted' && status != 'revoked') {
        throw ArgumentError('Status must be "granted" or "revoked"');
      }
      await _apiClient.post(
        '/users/profile/consent',
        body: {'consentType': consentType, 'status': status},
      );
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
          'An unexpected error occurred while updating consent.');
    }
  }

  /// (Admin) Changes the account status of a specific user.
  Future<User> changeAccountStatus(
      {required String userId, required String status}) async {
    try {
      // Ensure status is valid before sending
      if (!['active', 'suspended', 'banned'].contains(status)) {
        throw ArgumentError('Status must be one of: active, suspended, banned');
      }
      final responseData = await _apiClient.patch(
        '/users/$userId/status',
        body: {'status': status},
      );
      return User.fromJson(responseData['data']['user']);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
          "An unexpected error occurred while changing account status.");
    }
  }

  /// Updates user consent for a specific consent type
  Future<User> updateConsent(String consentType, String status) async {
    try {
      final responseData = await _apiClient.put('/users/consent', body: {
        'consentType': consentType,
        'status': status,
      });
      return User.fromJson(responseData['data']['user']);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
          'An unexpected error occurred while updating consent.');
    }
  }

  /// Updates user location with coordinates
  Future<User> updateLocation({
    String? city,
    String? country,
    List<double>? coordinates,
  }) async {
    try {
      final Map<String, dynamic> body = {};
      if (city != null) body['city'] = city;
      if (country != null) body['country'] = country;
      if (coordinates != null) {
        body['coordinates'] = coordinates;
      }

      final responseData = await _apiClient.patch('/users/profile/location', body: body);
      return User.fromJson(responseData['data']['user']);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
          'An unexpected error occurred while updating location.');
    }
  }

  /// Updates user demographics information
  Future<User> updateDemographics({
    String? ageRange,
    String? gender,
    String? occupation,
    String? educationLevel,
    String? incomeRange,
  }) async {
    try {
      final Map<String, dynamic> body = {};
      if (ageRange != null) body['ageRange'] = ageRange;
      if (gender != null) body['gender'] = gender;
      if (occupation != null) body['occupation'] = occupation;
      if (educationLevel != null) body['educationLevel'] = educationLevel;
      if (incomeRange != null) body['incomeRange'] = incomeRange;

      final responseData = await _apiClient.patch('/users/profile/demographics', body: body);
      return User.fromJson(responseData['data']['user']);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
          'An unexpected error occurred while updating demographics.');
    }
  }

  Future<List<User>> getAllUsers() async {
    try {
      final responseData = await _apiClient.get('users');
      final usersData = responseData['data']['users'];

      if (usersData == null) {
        return [];
      }

      final usersJson = usersData as List;
      return usersJson.map((json) => User.fromJson(json)).toList();
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('An unexpected error occurred while fetching users.');
    }
  }
}
