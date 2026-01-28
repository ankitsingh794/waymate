@echo off
echo === WayMate Authentication Status Check ===
echo.

REM Check if Flutter is available
flutter --version > nul 2>&1
if errorlevel 1 (
    echo ERROR: Flutter is not installed or not in PATH
    pause
    exit /b 1
)

echo Checking authentication status...
echo.

REM Navigate to mobile directory
cd /d "%~dp0mobile" 2>nul
if errorlevel 1 (
    echo ERROR: Mobile directory not found
    pause
    exit /b 1
)

REM Run a simple Dart script to check auth status
echo import 'dart:io'; > check_auth.dart
echo import 'package:flutter_secure_storage/flutter_secure_storage.dart'; >> check_auth.dart
echo. >> check_auth.dart
echo void main() async { >> check_auth.dart
echo   const storage = FlutterSecureStorage(); >> check_auth.dart
echo   try { >> check_auth.dart
echo     final accessToken = await storage.read(key: 'accessToken'); >> check_auth.dart
echo     final refreshToken = await storage.read(key: 'refreshToken'); >> check_auth.dart
echo     final lastLogin = await storage.read(key: 'lastLoginTime'); >> check_auth.dart
echo. >> check_auth.dart
echo     if (accessToken == null ^&^& refreshToken == null) { >> check_auth.dart
echo       print('RESULT: No authentication tokens found'); >> check_auth.dart
echo       print('ACTION: You need to login online first to enable offline mode'); >> check_auth.dart
echo     } else { >> check_auth.dart
echo       print('RESULT: Authentication tokens found'); >> check_auth.dart
echo       if (lastLogin != null) { >> check_auth.dart
echo         final loginDate = DateTime.fromMillisecondsSinceEpoch(int.parse(lastLogin)); >> check_auth.dart
echo         final daysSince = DateTime.now().difference(loginDate).inDays; >> check_auth.dart
echo         print('LAST LOGIN: $loginDate ($daysSince days ago)'); >> check_auth.dart
echo         if (daysSince ^<= 7) { >> check_auth.dart
echo           print('STATUS: Offline mode should work'); >> check_auth.dart
echo         } else { >> check_auth.dart
echo           print('STATUS: Offline session expired, need to login again'); >> check_auth.dart
echo         } >> check_auth.dart
echo       } >> check_auth.dart
echo     } >> check_auth.dart
echo   } catch (e) { >> check_auth.dart
echo     print('ERROR: $e'); >> check_auth.dart
echo   } >> check_auth.dart
echo } >> check_auth.dart

echo Running authentication check...
dart run check_auth.dart

REM Clean up
del check_auth.dart 2>nul

echo.
echo === Check Complete ===
pause