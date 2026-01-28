import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Comprehensive storage debug tool
class StorageDebugScreen extends StatefulWidget {
  const StorageDebugScreen({super.key});

  @override
  State<StorageDebugScreen> createState() => _StorageDebugScreenState();
}

class _StorageDebugScreenState extends State<StorageDebugScreen> {
  final storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock,
    ),
  );

  String debugLog = '';
  bool isLoading = false;

  @override
  void initState() {
    super.initState();
    print('STORAGE_DEBUG_INIT: StorageDebugScreen initialized!');
    print('STORAGE_DEBUG_INIT: Stack trace: ${StackTrace.current}');
  }

  void addLog(String message) {
    if (!mounted) {
      print(
          'STORAGE_DEBUG: addLog called but widget not mounted - message: $message');
      return;
    }
    setState(() {
      debugLog += '${DateTime.now().toIso8601String()}: $message\n';
    });
    print('STORAGE_DEBUG: $message');
  }

  Future<void> testBasicStorage() async {
    print(
        'STORAGE_DEBUG: testBasicStorage() called! Stack trace: ${StackTrace.current}');

    if (!mounted) {
      print(
          'STORAGE_DEBUG: testBasicStorage called but widget not mounted - ABORTING!');
      return;
    }

    setState(() {
      debugLog = '';
      isLoading = true;
    });

    try {
      addLog('=== BASIC STORAGE TEST ===');
      addLog('🛡️ USING ISOLATED DEBUG KEYS - WILL NOT AFFECT REAL AUTH DATA');

      // Test 1: Basic write/read using isolated keys
      addLog('Testing basic write/read...');
      await storage.write(key: 'debug_test_key', value: 'test_value');
      final testValue = await storage.read(key: 'debug_test_key');
      addLog(
          'Write/Read test: ${testValue == 'test_value' ? 'PASS' : 'FAIL'} (got: $testValue)');

      // Test 2: Check all existing keys (read-only)
      addLog('Checking all existing keys...');
      final allKeys = await storage.readAll();
      addLog('Found ${allKeys.length} keys: ${allKeys.keys.join(', ')}');

      // Test 3: Test token-like data with SAFE isolated keys
      addLog('Testing token storage (ISOLATED KEYS ONLY)...');
      const mockToken =
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      await storage.write(key: 'debug_testAccessToken', value: mockToken);
      await storage.write(key: 'debug_testRefreshToken', value: 'refresh_123');
      await storage.write(key: 'debug_testUserId', value: '12345');
      await storage.write(
          key: 'debug_testLastLogin',
          value: DateTime.now().millisecondsSinceEpoch.toString());

      // Verify tokens were stored
      final storedAccess = await storage.read(key: 'debug_testAccessToken');
      final storedRefresh = await storage.read(key: 'debug_testRefreshToken');
      final storedUserId = await storage.read(key: 'debug_testUserId');
      final storedLastLogin = await storage.read(key: 'debug_testLastLogin');

      addLog('Token storage test (ISOLATED):');
      addLog(
          '  Access Token: ${storedAccess?.substring(0, 20)}... ${storedAccess != null ? 'STORED' : 'FAILED'}');
      addLog(
          '  Refresh Token: $storedRefresh ${storedRefresh != null ? 'STORED' : 'FAILED'}');
      addLog(
          '  User ID: $storedUserId ${storedUserId != null ? 'STORED' : 'FAILED'}');
      addLog(
          '  Last Login: $storedLastLogin ${storedLastLogin != null ? 'STORED' : 'FAILED'}');

      // Test 4: Check if tokens persist after restart (simulated)
      addLog('Testing persistence...');
      await Future.delayed(const Duration(seconds: 1));
      final persistedAccess = await storage.read(key: 'debug_testAccessToken');
      addLog('Persistence test: ${persistedAccess != null ? 'PASS' : 'FAIL'}');

      // Clean up debug keys
      addLog('Cleaning up isolated debug keys...');
      await storage.delete(key: 'debug_test_key');
      await storage.delete(key: 'debug_testAccessToken');
      await storage.delete(key: 'debug_testRefreshToken');
      await storage.delete(key: 'debug_testUserId');
      await storage.delete(key: 'debug_testLastLogin');
      addLog('✅ Debug keys cleaned up - real auth data unaffected');
    } catch (e, stackTrace) {
      addLog('ERROR: $e');
      addLog('Stack: $stackTrace');
    } finally {
      setState(() => isLoading = false);
    }
  }

  Future<void> testActualAuthTokens() async {
    setState(() => isLoading = true);

    try {
      addLog('=== ACTUAL AUTH TOKENS TEST ===');

      // Check for real auth tokens
      final accessToken = await storage.read(key: 'accessToken');
      final refreshToken = await storage.read(key: 'refreshToken');
      final userId = await storage.read(key: 'userId');
      final lastLogin = await storage.read(key: 'lastLoginTime');

      addLog('Real auth tokens:');
      addLog(
          '  Access Token: ${accessToken != null ? 'EXISTS (${accessToken.length} chars)' : 'NULL'}');
      addLog(
          '  Refresh Token: ${refreshToken != null ? 'EXISTS (${refreshToken.length} chars)' : 'NULL'}');
      addLog('  User ID: ${userId ?? 'NULL'}');
      addLog('  Last Login: ${lastLogin ?? 'NULL'}');

      if (lastLogin != null) {
        try {
          final loginDate =
              DateTime.fromMillisecondsSinceEpoch(int.parse(lastLogin));
          final daysSince = DateTime.now().difference(loginDate).inDays;
          addLog('  Login Date: $loginDate ($daysSince days ago)');
          addLog('  Session Valid: ${daysSince <= 7 ? 'YES' : 'NO'}');
        } catch (e) {
          addLog('  Login Date Parse Error: $e');
        }
      }
    } catch (e) {
      addLog('ERROR checking real tokens: $e');
    } finally {
      setState(() => isLoading = false);
    }
  }

  Future<void> simulateLogin() async {
    setState(() => isLoading = true);

    try {
      addLog('=== SIMULATING LOGIN ===');
      addLog(
          '🛡️ USING SAFE SIMULATION - WILL NOT OVERWRITE REAL AUTH TOKENS!');

      // Show warning first
      final shouldProceed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('⚠️ Login Simulation'),
          content: const Text(
              'This will demonstrate login token storage using SAFE isolated keys.\n\n'
              'Your real authentication tokens will NOT be affected.\n\n'
              'Continue with safe simulation?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Safe Simulate'),
            ),
          ],
        ),
      );

      if (shouldProceed != true) {
        addLog('❌ User cancelled simulation');
        return;
      }

      // Simulate what happens during login using SAFE keys
      const mockAccessToken = 'mock_access_token_12345';
      const mockRefreshToken = 'mock_refresh_token_67890';
      const mockUserId = 'user_12345';

      addLog('Saving mock tokens to ISOLATED keys...');

      // Save tokens using SAFE isolated keys that don't interfere with real auth
      await storage.write(key: 'debug_sim_accessToken', value: mockAccessToken);
      await storage.write(
          key: 'debug_sim_refreshToken', value: mockRefreshToken);
      await storage.write(key: 'debug_sim_userId', value: mockUserId);
      await storage.write(key: 'debug_sim_userRole', value: 'user');
      await storage.write(
          key: 'debug_sim_lastLoginTime',
          value: DateTime.now().millisecondsSinceEpoch.toString());

      addLog('Mock tokens saved to isolated keys. Verifying...');

      // Immediately verify
      final savedAccess = await storage.read(key: 'debug_sim_accessToken');
      final savedRefresh = await storage.read(key: 'debug_sim_refreshToken');
      final savedUserId = await storage.read(key: 'debug_sim_userId');
      final savedLastLogin = await storage.read(key: 'debug_sim_lastLoginTime');

      addLog('Simulation verification results:');
      addLog(
          '  Access: ${savedAccess == mockAccessToken ? 'MATCH' : 'MISMATCH'} ($savedAccess)');
      addLog(
          '  Refresh: ${savedRefresh == mockRefreshToken ? 'MATCH' : 'MISMATCH'} ($savedRefresh)');
      addLog(
          '  User ID: ${savedUserId == mockUserId ? 'MATCH' : 'MISMATCH'} ($savedUserId)');
      addLog(
          '  Last Login: ${savedLastLogin != null ? 'SET' : 'NULL'} ($savedLastLogin)');

      // Clean up simulation keys
      addLog('Cleaning up simulation keys...');
      await storage.delete(key: 'debug_sim_accessToken');
      await storage.delete(key: 'debug_sim_refreshToken');
      await storage.delete(key: 'debug_sim_userId');
      await storage.delete(key: 'debug_sim_userRole');
      await storage.delete(key: 'debug_sim_lastLoginTime');
      addLog('✅ Simulation complete - real auth tokens preserved!');
    } catch (e) {
      addLog('ERROR during simulate login: $e');
    } finally {
      setState(() => isLoading = false);
    }
  }

  Future<void> clearAllData() async {
    try {
      print(
          'CRITICAL: clearAllData() called! Stack trace: ${StackTrace.current}');
      addLog('⛔ DANGER: clearAllData() called!');

      // COMPLETE SAFETY: NEVER allow automatic clearing of authentication data
      if (!mounted) {
        print(
            'STORAGE_DEBUG: clearAllData blocked - widget not properly mounted');
        addLog('❌ BLOCKED: Widget not mounted - preventing data loss');
        return;
      }

      // Show confirmation dialog to prevent accidental clearing
      final shouldClear = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: const Text('⚠️ DANGER'),
          content: const Text(
              'This will DELETE ALL STORAGE DATA including authentication tokens!\n\n'
              'You will be logged out and need to login again.\n\n'
              'Are you absolutely sure?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('DELETE ALL DATA'),
            ),
          ],
        ),
      );

      if (shouldClear != true) {
        addLog('✅ User cancelled - data preserved');
        return;
      }

      addLog('🗑️ User confirmed - clearing all storage data...');
      await storage.deleteAll();
      addLog('❌ All data cleared - authentication tokens deleted!');
      addLog('🔄 App restart may be required to re-login');
    } catch (e) {
      addLog('Error clearing data: $e');
    }
  }

  Future<void> testStoragePermissions() async {
    setState(() => isLoading = true);

    try {
      addLog('=== STORAGE PERMISSIONS TEST ===');

      // Check if we can create the storage instance
      addLog('Testing storage instance creation...');
      addLog('Default storage instance: OK');

      // Test with different Android options
      addLog('Testing with encryptedSharedPreferences=false...');
      const altStorage = FlutterSecureStorage(
        aOptions: AndroidOptions(
          encryptedSharedPreferences: false,
        ),
      );

      await altStorage.write(key: 'test_alt', value: 'alt_value');
      final altValue = await altStorage.read(key: 'test_alt');
      addLog(
          'Alternative storage test: ${altValue == 'alt_value' ? 'PASS' : 'FAIL'}');

      // Test platform info
      addLog(
          'Platform: ${Platform.isAndroid ? 'Android' : Platform.isIOS ? 'iOS' : 'Other'}');
    } catch (e) {
      addLog('Permissions test error: $e');
    } finally {
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Storage Debug'),
        backgroundColor: Colors.red,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                ElevatedButton(
                  onPressed: isLoading ? null : testBasicStorage,
                  child: const Text('Basic Test'),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: isLoading ? null : testActualAuthTokens,
                  child: const Text('Check Auth'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                ElevatedButton(
                  onPressed: isLoading ? null : simulateLogin,
                  child: const Text('Simulate Login'),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: isLoading ? null : testStoragePermissions,
                  child: const Text('Permissions'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: clearAllData,
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              child: const Text('Clear All',
                  style: TextStyle(color: Colors.white)),
            ),
            const SizedBox(height: 16),
            if (isLoading)
              const Center(child: CircularProgressIndicator())
            else
              Expanded(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: SingleChildScrollView(
                    child: Text(
                      debugLog.isEmpty ? 'Tap a button to run tests' : debugLog,
                      style: const TextStyle(
                        color: Colors.green,
                        fontFamily: 'monospace',
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
