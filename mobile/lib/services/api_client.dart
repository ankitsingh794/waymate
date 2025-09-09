import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:mime/mime.dart';
import 'package:mobile/config/app_config.dart';
import 'package:mobile/services/auth_service.dart';
import 'package:mobile/services/navigator_service.dart';
import 'package:mobile/screens/auth/login_screen.dart';

// A custom exception class for handling API errors gracefully.
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, [this.statusCode]);

  @override
  String toString() {
    return 'ApiException: $message (Status code: $statusCode)';
  }
}

// ApiClient handles all HTTP communication, including authentication,
// token refreshing, and error handling.
class ApiClient {
  final String baseUrl = AppConfig.baseUrl;
  final AuthService _authService = AuthService();
  
  static bool _isRefreshing = false;
  static Completer<void>? _refreshCompleter;

  ApiClient();

  // --- Public HTTP Methods ---

  Future<dynamic> get(String endpoint) async {
    final response = await _makeRequest('GET', endpoint);
    return response;
  }

  Future<dynamic> post(String endpoint, {Map<String, dynamic>? body}) async {
    final response = await _makeRequest('POST', endpoint, body: body);
    return response;
  }

  Future<dynamic> patch(String endpoint, {Map<String, dynamic>? body}) async {
    final response = await _makeRequest('PATCH', endpoint, body: body);
    return response;
  }
  
  Future<dynamic> delete(String endpoint, {Map<String, dynamic>? body}) async {
    final response = await _makeRequest('DELETE', endpoint, body: body);
    return response;
  }
  
  /// **NEW**: Handles file downloads by streaming the response.
  /// This method is memory-efficient and suitable for large files.
  Future<http.StreamedResponse> download(String endpoint) async {
    final uri = Uri.parse('$baseUrl/$endpoint');
    await _waitForRefresh();
    final token = await _authService.getAccessToken();
    _ensureAuthenticated(token);

    try {
        final request = http.Request('GET', uri);
        request.headers['Authorization'] = 'Bearer $token';
        
        final streamedResponse = await request.send().timeout(const Duration(minutes: 5));

        if (streamedResponse.statusCode == 401) {
            // If unauthorized, attempt to refresh and retry the download.
            return _handle401AndRetry(() => download(endpoint));
        }

        if (streamedResponse.statusCode >= 200 && streamedResponse.statusCode < 300) {
            return streamedResponse;
        } else {
            // Try to read the error message from the stream without consuming it.
            final body = await streamedResponse.stream.bytesToString();
            final message = json.decode(body)['message'] ?? 'Failed to download file.';
            throw ApiException(message, streamedResponse.statusCode);
        }
    } on SocketException {
        throw ApiException('No internet connection.');
    } on TimeoutException {
        throw ApiException('The connection has timed out.');
    } catch (e) {
        throw ApiException(e.toString());
    }
  }

  Future<dynamic> postWithFile(String endpoint, {required File file, required String fileField}) async {
    return _uploadFile('POST', endpoint, file: file, fileField: fileField);
  }

  Future<dynamic> patchWithFile(String endpoint, {required File file, required String fileField}) async {
    return _uploadFile('PATCH', endpoint, file: file, fileField: fileField);
  }

  // --- Private File Upload Logic ---
  
  Future<dynamic> _uploadFile(String method, String endpoint, {required File file, required String fileField}) async {
    final uri = Uri.parse('$baseUrl/$endpoint');
    await _waitForRefresh();
    final token = await _authService.getAccessToken();
    _ensureAuthenticated(token);

    final mimeType = lookupMimeType(file.path) ?? 'application/octet-stream';
    final mediaType = MediaType.parse(mimeType);

    try {
      var request = http.MultipartRequest(method, uri)
        ..headers['Authorization'] = 'Bearer $token'
        ..files.add(await http.MultipartFile.fromPath(
            fileField, 
            file.path,
            contentType: mediaType,
        ));
        
      var streamedResponse = await request.send().timeout(const Duration(seconds: 45));
      var response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 401) {
        return _handle401AndRetry(() => _uploadFile(method, endpoint, file: file, fileField: fileField));
      }

      return _handleResponse(response);

    } on SocketException {
      throw ApiException('No internet connection.');
    } on TimeoutException {
       throw ApiException('The connection has timed out.');
    } catch (e) {
      throw ApiException('An unexpected error occurred during file upload.');
    }
  }

  // --- Core Request & Response Logic for JSON APIs ---

  Future<dynamic> _makeRequest(String method, String endpoint, {Map<String, dynamic>? body}) async {
    final uri = Uri.parse('$baseUrl/$endpoint');
    await _waitForRefresh();
    final token = await _authService.getAccessToken();
    _ensureAuthenticated(token);

    try {
      final headers = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': 'Bearer $token',
      };
      final requestBody = body != null ? json.encode(body) : null;

      http.Response response;
      switch (method) {
        case 'GET':
          response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 15));
          break;
        case 'POST':
          response = await http.post(uri, headers: headers, body: requestBody).timeout(const Duration(seconds: 15));
          break;
        case 'PATCH':
          response = await http.patch(uri, headers: headers, body: requestBody).timeout(const Duration(seconds: 15));
          break;
        case 'DELETE':
          response = await http.delete(uri, headers: headers, body: requestBody).timeout(const Duration(seconds: 15));
          break;
        default:
          throw ApiException('Unsupported HTTP method: $method');
      }

      if (response.statusCode == 401) {
        return await _handle401AndRetry(() => _makeRequest(method, endpoint, body: body));
      }
      
      return _handleResponse(response);

    } on SocketException {
      throw ApiException('No internet connection. Please check your network.');
    } on TimeoutException {
       throw ApiException('The server is not responding. Please try again later.');
    } catch (e) {
      throw ApiException('An unexpected error occurred: ${e.toString()}');
    }
  }

  dynamic _handleResponse(http.Response response) {
    if (response.body.isEmpty) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
            return null;
        } else {
            throw ApiException('An unknown API error occurred.', response.statusCode);
        }
    }
    final responseBody = json.decode(utf8.decode(response.bodyBytes));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return responseBody;
    } else {
      throw ApiException(responseBody['message'] ?? 'An unknown API error occurred.', response.statusCode);
    }
  }
  
  // --- Auth and Error Handling Helpers ---

  Future<void> _waitForRefresh() async {
    if (_isRefreshing) {
      await _refreshCompleter?.future;
    }
  }

  void _ensureAuthenticated(String? token) {
    if (token == null) {
      _handleLogout();
      throw ApiException('Not authenticated. Please log in.', 401);
    }
  }
  
  Future<T> _handle401AndRetry<T>(Future<T> Function() retryRequest) async {
    final bool success = await _handleTokenRefresh();
    if (success) {
      return await retryRequest();
    } else {
      _handleLogout();
      throw ApiException('Your session has expired. Please log in again.', 401);
    }
  }

  Future<bool> _handleTokenRefresh() async {
    if (_isRefreshing) {
      await _refreshCompleter!.future;
      return true;
    }
    _isRefreshing = true;
    _refreshCompleter = Completer<void>();

    try {
      final result = await _authService.refreshToken();
      if (result['success']) {
        _refreshCompleter!.complete();
        return true;
      } else {
        throw Exception("Refresh token failed");
      }
    } catch(e) {
       _refreshCompleter!.completeError(e);
       return false;
    } finally {
      _isRefreshing = false;
    }
  }
  
  void _handleLogout() {
    _authService.logout();
    final context = GlobalNavigator.key.currentContext;
    if (context != null && context.mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
  }
}
