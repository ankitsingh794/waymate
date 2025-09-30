import 'dart:convert';
import 'dart:async';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:mobile/utils/logger.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile/config/app_config.dart';
import 'package:jwt_decode/jwt_decode.dart'; // Add this to pubspec.yaml

class AuthService {
  final String baseUrl = '${AppConfig.baseUrl}/auth';
  final storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock,
    ),
  );

  // --- Token Management with Offline Support ---
  
  Future<void> saveTokens(String accessToken, String refreshToken) async {
    await storage.write(key: 'accessToken', value: accessToken);
    await storage.write(key: 'refreshToken', value: refreshToken);
    
    // Store token metadata for offline validation
    final tokenData = Jwt.parseJwt(accessToken);
    await storage.write(key: 'tokenExpiry', value: tokenData['exp'].toString());
    await storage.write(key: 'userId', value: tokenData['sub'].toString());
    await storage.write(key: 'userRole', value: tokenData['role'] ?? 'user');
    
    // Cache last successful login time
    await storage.write(key: 'lastLoginTime', value: DateTime.now().millisecondsSinceEpoch.toString());
  }

  Future<String?> getAccessToken() => storage.read(key: 'accessToken');
  Future<String?> getRefreshToken() => storage.read(key: 'refreshToken');

  Future<void> clearTokens() async {
    await storage.deleteAll();
  }

  // --- Offline Authentication Methods ---
  
  /// Check if user is authenticated (works offline)
  Future<bool> isAuthenticated() async {
    try {
      final accessToken = await getAccessToken();
      if (accessToken == null) return false;

      // First check token expiry offline
      final isTokenValid = await _isTokenValidOffline(accessToken);
      if (!isTokenValid) {
        logger.d('Token expired or invalid offline');
        return false;
      }

      // If online, try to validate with server (optional)
      if (await _hasInternetConnection()) {
        return await _validateTokenOnline();
      }

      // Offline mode: accept locally cached valid token
      return true;
    } catch (e, s) {
      logger.e('Authentication check failed', error: e, stackTrace: s);
      return false;
    }
  }

  /// Validate token offline using JWT parsing
  Future<bool> _isTokenValidOffline(String token) async {
    try {
      // Check if token is expired
      if (Jwt.isExpired(token)) {
        logger.d('JWT token is expired');
        return false;
      }

      // Verify token structure
      final payload = Jwt.parseJwt(token);
      final userId = payload['sub'];
      final role = payload['role'];

      if (userId == null) {
        logger.d('Token missing user ID');
        return false;
      }

      // Additional offline checks
      final storedUserId = await storage.read(key: 'userId');
      if (storedUserId != userId.toString()) {
        logger.d('Token user ID mismatch');
        return false;
      }

      return true;
    } catch (e, s) {
      logger.e('Offline token validation failed', error: e, stackTrace: s);
      return false;
    }
  }

  /// Validate token with server when online
  Future<bool> _validateTokenOnline() async {
    try {
      final token = await getAccessToken();
      final response = await http.get(
        Uri.parse('$baseUrl/validate-token'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        return true;
      } else if (response.statusCode == 401) {
        // Token invalid, try refresh
        final refreshResult = await refreshToken();
        return refreshResult['success'] ?? false;
      }
      return false;
    } catch (e) {
      // Network error - fallback to offline validation
      logger.w('Online token validation failed, using offline: $e');
      final token = await getAccessToken();
      return token != null ? await _isTokenValidOffline(token) : false;
    }
  }

  /// Get cached user data (works offline)
  Future<Map<String, dynamic>?> getCachedUserData() async {
    try {
      final userId = await storage.read(key: 'userId');
      final userRole = await storage.read(key: 'userRole');
      final lastLogin = await storage.read(key: 'lastLoginTime');

      if (userId == null) return null;

      return {
        'id': userId,
        'role': userRole ?? 'user',
        'lastLogin': lastLogin != null 
          ? DateTime.fromMillisecondsSinceEpoch(int.parse(lastLogin))
          : null,
        'isOfflineSession': !(await _hasInternetConnection()),
      };
    } catch (e, s) {
      logger.e('Failed to get cached user data', error: e, stackTrace: s);
      return null;
    }
  }

  /// Check for offline session timeout (prevents indefinite offline access)
  Future<bool> isOfflineSessionValid() async {
    try {
      const maxOfflineDays = 7; // Configurable offline session duration
      final lastLoginStr = await storage.read(key: 'lastLoginTime');
      
      if (lastLoginStr == null) return false;
      
      final lastLogin = DateTime.fromMillisecondsSinceEpoch(int.parse(lastLoginStr));
      final daysSinceLogin = DateTime.now().difference(lastLogin).inDays;
      
      return daysSinceLogin <= maxOfflineDays;
    } catch (e, s) {
      logger.e('Offline session validation failed', error: e, stackTrace: s);
      return false;
    }
  }

  /// Enhanced authentication check with offline support
  Future<bool> canAccessApp() async {
    // Check if authenticated
    if (!(await isAuthenticated())) {
      return false;
    }

    // If offline, check session validity
    if (!(await _hasInternetConnection())) {
      return await isOfflineSessionValid();
    }

    return true;
  }

  // --- Network Connectivity Check ---
  
  Future<bool> _hasInternetConnection() async {
    try {
      final result = await InternetAddress.lookup('google.com').timeout(
        const Duration(seconds: 3),
      );
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } catch (e) {
      return false;
    }
  }

  // --- Centralized Request Handling (Enhanced for Offline) ---
  
  Future<Map<String, dynamic>> handleRequest(Future<http.Response> request) async {
    try {
      final response = await request.timeout(const Duration(seconds: 15));
      final responseData = json.decode(response.body);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        responseData['success'] = responseData['success'] ?? true;
        return {
          'success': true,
          'data': responseData['data'],
          'message': responseData['message'],
        };
      } else {
        return {
          'success': false,
          'message': responseData['message'] ?? 'An unknown error occurred.',
          'statusCode': response.statusCode,
        };
      }
    } on SocketException {
      return {
        'success': false,
        'message': 'No internet connection. Operating in offline mode.',
        'isOffline': true,
      };
    } on TimeoutException {
      return {
        'success': false,
        'message': 'Connection timed out. Please try again.',
        'isTimeout': true,
      };
    } catch (e, s) {
      logger.e('AuthService Error', error: e, stackTrace: s);
      return {
        'success': false,
        'message': 'An unexpected error occurred.',
      };
    }
  }

  // --- API Methods (Enhanced with Offline Support) ---
  
  Future<Map<String, dynamic>> login(String email, String password) async {
    final result = await handleRequest(
      http.post(
        Uri.parse('$baseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
          'password': password,
        }),
      ),
    );

    if (result['success']) {
      await saveTokens(
        result['data']['accessToken'],
        result['data']['refreshToken'],
      );
      
      // Cache additional user data for offline use
      if (result['data']['user'] != null) {
        await storage.write(
          key: 'userEmail', 
          value: result['data']['user']['email'] ?? email,
        );
        await storage.write(
          key: 'userName', 
          value: result['data']['user']['name'] ?? '',
        );
      }
    }

    return result;
  }

  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    String? role,
  }) async {
    return handleRequest(
      http.post(
        Uri.parse('$baseUrl/register'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'name': name,
          'email': email,
          'password': password,
          'role': role ?? 'user',
        }),
      ),
    );
  }

  Future<Map<String, dynamic>> verifyEmail(String token) async {
    final result = await handleRequest(
      http.post(
        Uri.parse('$baseUrl/verify-email'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'token': token}),
      ),
    );

    if (result['success']) {
      await saveTokens(
        result['data']['accessToken'],
        result['data']['refreshToken'],
      );
    }

    return result;
  }

  Future<Map<String, dynamic>> forgotPassword(String email) {
    return handleRequest(
      http.post(
        Uri.parse('$baseUrl/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'email': email}),
      ),
    );
  }

  Future<Map<String, dynamic>> resetPassword({
    required String token,
    required String password,
  }) async {
    final result = await handleRequest(
      http.post(
        Uri.parse('$baseUrl/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'token': token,
          'password': password,
        }),
      ),
    );

    if (result['success']) {
      await saveTokens(
        result['data']['accessToken'],
        result['data']['refreshToken'],
      );
    }

    return result;
  }

  Future<Map<String, dynamic>> resendVerificationEmail(String email) {
    return handleRequest(
      http.post(
        Uri.parse('$baseUrl/resend-verification'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'email': email}),
      ),
    );
  }

  Future<Map<String, dynamic>> updatePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final accessToken = await getAccessToken();
    if (accessToken == null) {
      return {'success': false, 'message': 'User not authenticated.'};
    }

    return handleRequest(
      http.patch(
        Uri.parse('$baseUrl/update-password'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $accessToken',
        },
        body: json.encode({
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        }),
      ),
    );
  }

  Future<Map<String, dynamic>> refreshToken() async {
    final refreshToken = await getRefreshToken();
    if (refreshToken == null) {
      return {'success': false, 'message': 'No refresh token found.'};
    }

    final result = await handleRequest(
      http.post(
        Uri.parse('$baseUrl/refresh-token'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'refreshToken': refreshToken}),
      ),
    );

    if (result['success']) {
      await saveTokens(
        result['data']['accessToken'],
        result['data']['refreshToken'],
      );
    } else {
      // If refresh fails, clear potentially invalid tokens
      await clearTokens();
    }

    return result;
  }

  Future<Map<String, dynamic>> logout() async {
    final refreshToken = await getRefreshToken();
    final accessToken = await getAccessToken();

    // Always clear local tokens first
    await clearTokens();

    // Try to notify server if online
    if (await _hasInternetConnection()) {
      if (refreshToken == null || accessToken == null) {
        return {'success': true, 'message': 'Logged out locally.'};
      }

      final result = await handleRequest(
        http.post(
          Uri.parse('$baseUrl/logout'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $accessToken',
          },
          body: json.encode({'refreshToken': refreshToken}),
        ),
      );
      
      return result;
    }

    return {'success': true, 'message': 'Logged out offline.'};
  }

  // --- Utility Methods for Offline Support ---
  
  /// Reset offline session (force re-authentication)
  Future<void> resetOfflineSession() async {
    await storage.delete(key: 'lastLoginTime');
  }

  /// Get offline session status
  Future<Map<String, dynamic>> getOfflineStatus() async {
    final isOnline = await _hasInternetConnection();
    final isAuth = await isAuthenticated();
    final isValidOfflineSession = await isOfflineSessionValid();
    final lastLoginStr = await storage.read(key: 'lastLoginTime');
    
    return {
      'isOnline': isOnline,
      'isAuthenticated': isAuth,
      'isValidOfflineSession': isValidOfflineSession,
      'lastLogin': lastLoginStr != null 
        ? DateTime.fromMillisecondsSinceEpoch(int.parse(lastLoginStr))
        : null,
      'canAccessApp': await canAccessApp(),
    };
  }
}