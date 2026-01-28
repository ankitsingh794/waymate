import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Debug helper to check authentication state
class AuthDebugHelper {
  static const storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock,
    ),
  );

  /// Check and print all stored authentication data
  static Future<Map<String, String?>> checkStoredAuth() async {
    print('\n=== AUTHENTICATION DEBUG ===');

    final authData = <String, String?>{};

    try {
      // Check all auth-related keys
      final keys = [
        'accessToken',
        'refreshToken',
        'tokenExpiry',
        'userId',
        'userRole',
        'lastLoginTime'
      ];

      for (final key in keys) {
        final value = await storage.read(key: key);
        authData[key] = value;
        print(
            '$key: ${value != null ? "Present (${value.length} chars)" : "NULL"}');
      }

      // Check if user has ever logged in
      final hasTokens =
          authData['accessToken'] != null && authData['refreshToken'] != null;
      final lastLogin = authData['lastLoginTime'];

      print('\n--- ANALYSIS ---');
      print('Has Tokens: $hasTokens');

      if (lastLogin != null) {
        final loginDate =
            DateTime.fromMillisecondsSinceEpoch(int.parse(lastLogin));
        final daysSince = DateTime.now().difference(loginDate).inDays;
        print('Last Login: $loginDate ($daysSince days ago)');
        print('Offline Session Valid: ${daysSince <= 7}');
      } else {
        print('Last Login: NEVER');
      }

      // Check network connectivity
      final hasInternet = await _checkInternet();
      print('Internet Available: $hasInternet');

      print('=== END DEBUG ===\n');
    } catch (e, stackTrace) {
      print('Error checking auth state: $e');
      print('Stack trace: $stackTrace');
    }

    return authData;
  }

  /// Simple internet connectivity check
  static Future<bool> _checkInternet() async {
    try {
      final result = await InternetAddress.lookup('google.com').timeout(
        const Duration(seconds: 3),
      );
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } catch (e) {
      return false;
    }
  }

  /// Clear all authentication data (for testing)
  static Future<void> clearAllAuth() async {
    print('Clearing all authentication data...');
    await storage.deleteAll();
    print('All authentication data cleared.');
  }
}

/// Widget to display debug information
class AuthDebugScreen extends StatefulWidget {
  const AuthDebugScreen({super.key});

  @override
  State<AuthDebugScreen> createState() => _AuthDebugScreenState();
}

class _AuthDebugScreenState extends State<AuthDebugScreen> {
  Map<String, String?>? authData;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAuthData();
  }

  Future<void> _loadAuthData() async {
    setState(() => isLoading = true);
    final data = await AuthDebugHelper.checkStoredAuth();
    setState(() {
      authData = data;
      isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Auth Debug'),
        actions: [
          IconButton(
            onPressed: _loadAuthData,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Authentication State',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  if (authData != null) ...[
                    ...authData!.entries.map((entry) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(
                                width: 120,
                                child: Text(
                                  entry.key + ':',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold),
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  entry.value ?? 'NULL',
                                  style: TextStyle(
                                    color: entry.value != null
                                        ? Colors.green
                                        : Colors.red,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        )),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () async {
                        await AuthDebugHelper.clearAllAuth();
                        _loadAuthData();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Clear All Auth Data'),
                    ),
                  ],
                ],
              ),
            ),
    );
  }
}
