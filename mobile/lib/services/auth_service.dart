import 'dart:convert';
import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile/config/app_config.dart';

class AuthService {
  final String _baseUrl = '${AppConfig.baseUrl}/auth';
  final _storage = const FlutterSecureStorage();

  // --- Token Management ---
  Future<void> _saveTokens(String accessToken, String refreshToken) async {
    await _storage.write(key: 'accessToken', value: accessToken);
    await _storage.write(key: 'refreshToken', value: refreshToken);
  }

  Future<String?> getAccessToken() => _storage.read(key: 'accessToken');
  Future<String?> getRefreshToken() => _storage.read(key: 'refreshToken');

  Future<void> clearTokens() async {
    await _storage.delete(key: 'accessToken');
    await _storage.delete(key: 'refreshToken');
  }

  // --- Centralized Request Handling ---
  Future<Map<String, dynamic>> _handleRequest(Future<http.Response> request) async {
    try {
      final response = await request.timeout(const Duration(seconds: 15));
      final responseData = json.decode(response.body);

      if (response.statusCode >= 200 && response.statusCode < 300 && (responseData['success'] ?? false)) {
        return {'success': true, 'data': responseData['data'], 'message': responseData['message']};
      } else {
        return {'success': false, 'message': responseData['message'] ?? 'An unknown error occurred.'};
      }
    } on SocketException {
       return {'success': false, 'message': 'No internet connection. Please check your network.'};
    } on TimeoutException {
       return {'success': false, 'message': 'The connection timed out. Please try again.'};
    } catch (e) {
      debugPrint('AuthService Error: $e');
      return {'success': false, 'message': 'An unexpected error occurred.'};
    }
  }

  // --- API Methods ---
  
  Future<Map<String, dynamic>> login(String email, String password) async {
    final result = await _handleRequest(http.post(
      Uri.parse('$_baseUrl/login'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'email': email, 'password': password}),
    ));

    if (result['success']) {
      await _saveTokens(
        result['data']['accessToken'],
        result['data']['refreshToken'],
      );
    }
    return result;
  }
  
  Future<Map<String, dynamic>> register({required String name, required String email, required String password, String? role}) {
    return _handleRequest(http.post(
      Uri.parse('$_baseUrl/register'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'name': name, 'email': email, 'password': password, 'role': role ?? 'user'}),
    ));
  }

  Future<Map<String, dynamic>> verifyEmail(String token) async {
    final result = await _handleRequest(http.post(
      Uri.parse('$_baseUrl/verify-email'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'token': token}),
    ));
    if (result['success']) {
       await _saveTokens(
        result['data']['accessToken'],
        result['data']['refreshToken'],
      );
    }
    return result;
  }
  
  Future<Map<String, dynamic>> forgotPassword(String email) {
    return _handleRequest(http.post(
      Uri.parse('$_baseUrl/forgot-password'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'email': email}),
    ));
  }

  // NEW: Implemented resetPassword to align with backend
  Future<Map<String, dynamic>> resetPassword({required String token, required String password}) async {
    final result = await _handleRequest(http.post(
        Uri.parse('$_baseUrl/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'token': token, 'password': password}),
    ));

     if (result['success']) {
       await _saveTokens(
        result['data']['accessToken'],
        result['data']['refreshToken'],
      );
    }
    return result;
  }

  // NEW: Implemented resendVerificationEmail to align with backend
  Future<Map<String, dynamic>> resendVerificationEmail(String email) {
    return _handleRequest(http.post(
      Uri.parse('$_baseUrl/resend-verification'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'email': email}),
    ));
  }
  
  // NEW: Implemented updatePassword for authenticated users
  // Note: This method should be called via ApiClient to handle auth headers and token refresh
  Future<Map<String, dynamic>> updatePassword({required String currentPassword, required String newPassword}) async {
      // This is a placeholder as the actual call will be made through ApiClient
      // which will add the necessary auth headers.
      // The implementation is in ApiClient.
      throw UnimplementedError("updatePassword must be called via an ApiClient instance.");
  }


  Future<Map<String, dynamic>> refreshToken() async {
    final refreshToken = await getRefreshToken();
    if (refreshToken == null) return {'success': false, 'message': 'No refresh token found.'};

    // The backend now correctly accepts the token in the body.
    final result = await _handleRequest(http.post(
      Uri.parse('$_baseUrl/refresh-token'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'refreshToken': refreshToken}),
    ));

    if (result['success']) {
      await _saveTokens(
        result['data']['accessToken'],
        result['data']['refreshToken'],
      );
    } else {
      // If refresh fails, clear potentially invalid tokens
      await clearTokens();
    }
    return result;
  }

  // UPDATED: Logout now informs the backend to invalidate tokens
  Future<Map<String, dynamic>> logout() async {
      final refreshToken = await getRefreshToken();
      final accessToken = await getAccessToken();

      // Even if tokens are null, proceed to clear local storage
      if (refreshToken == null || accessToken == null) {
          await clearTokens();
          return {'success': true, 'message': 'Logged out locally.'};
      }

      // Make a best-effort attempt to log out from the server
      final result = await _handleRequest(
          http.post(
              Uri.parse('$_baseUrl/logout'),
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer $accessToken',
              },
              body: json.encode({'refreshToken': refreshToken}),
          ),
      );

      // Regardless of server response, clear local tokens
      await clearTokens();
      return result;
  }
}
