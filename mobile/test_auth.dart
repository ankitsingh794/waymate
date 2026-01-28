// Simple test script to check authentication status
// Run this with: dart run test_auth.dart

import 'dart:io';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:jwt_decode/jwt_decode.dart';

const storage = FlutterSecureStorage(
  aOptions: AndroidOptions(
    encryptedSharedPreferences: true,
  ),
  iOptions: IOSOptions(
    accessibility: KeychainAccessibility.first_unlock,
  ),
);

Future<void> main() async {
  print('=== WayMate Authentication Debug ===\n');

  try {
    // Check all stored authentication data
    final accessToken = await storage.read(key: 'accessToken');
    final refreshToken = await storage.read(key: 'refreshToken');
    final tokenExpiry = await storage.read(key: 'tokenExpiry');
    final userId = await storage.read(key: 'userId');
    final userRole = await storage.read(key: 'userRole');
    final lastLoginTime = await storage.read(key: 'lastLoginTime');

    print('Stored Authentication Data:');
    print(
        '- Access Token: ${accessToken != null ? "Present (${accessToken.length} chars)" : "NULL"}');
    print(
        '- Refresh Token: ${refreshToken != null ? "Present (${refreshToken.length} chars)" : "NULL"}');
    print('- Token Expiry: $tokenExpiry');
    print('- User ID: $userId');
    print('- User Role: $userRole');
    print('- Last Login Time: $lastLoginTime');

    print('\n--- Analysis ---');

    // Check if user has ever logged in
    if (accessToken == null && refreshToken == null) {
      print('❌ No authentication tokens found');
      print('   This means you have never logged in successfully');
      print('   You need to connect to internet and login first');
    } else if (accessToken != null) {
      print('✅ Authentication tokens found');

      try {
        // Check token expiry
        if (Jwt.isExpired(accessToken)) {
          print('⚠️  Access token is expired');
        } else {
          print('✅ Access token is valid');
        }

        // Check offline session validity
        if (lastLoginTime != null) {
          final loginDate =
              DateTime.fromMillisecondsSinceEpoch(int.parse(lastLoginTime));
          final daysSince = DateTime.now().difference(loginDate).inDays;
          print('📅 Last login: $loginDate ($daysSince days ago)');

          if (daysSince <= 7) {
            print('✅ Offline session is valid (within 7 days)');
          } else {
            print('❌ Offline session expired (more than 7 days)');
          }
        } else {
          print('⚠️  No last login time found');
        }
      } catch (e) {
        print('❌ Error parsing token: $e');
      }
    }

    // Check network connectivity
    print('\n--- Network Check ---');
    try {
      final result = await InternetAddress.lookup('google.com').timeout(
        const Duration(seconds: 3),
      );
      if (result.isNotEmpty && result[0].rawAddress.isNotEmpty) {
        print('🌐 Internet connection: Available');
      } else {
        print('📵 Internet connection: Not available');
      }
    } catch (e) {
      print('📵 Internet connection: Not available ($e)');
    }

    print('\n--- Recommendations ---');
    if (accessToken == null) {
      print(
          '🔧 Solution: Connect to internet and login to cache authentication');
    } else if (lastLoginTime != null) {
      final loginDate =
          DateTime.fromMillisecondsSinceEpoch(int.parse(lastLoginTime));
      final daysSince = DateTime.now().difference(loginDate).inDays;
      if (daysSince > 7) {
        print(
            '🔧 Solution: Offline session expired, reconnect to internet and login');
      } else {
        print('✅ You should be able to use the app offline');
      }
    }
  } catch (e, stackTrace) {
    print('❌ Error: $e');
    print('Stack trace: $stackTrace');
  }
}
