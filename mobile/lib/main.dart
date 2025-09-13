// lib/main.dart

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_styled_toast/flutter_styled_toast.dart';

import 'package:mobile/screens/auth/email_verification_screen.dart';
import 'package:mobile/screens/auth/forgot_password_screen.dart';
import 'package:mobile/screens/auth/login_screen.dart';
import 'package:mobile/screens/auth/register_screen.dart';
import 'package:mobile/screens/auth/reset_password_screen.dart';
import 'package:mobile/screens/core/main_scaffold.dart';
import 'package:mobile/screens/splash/splash_screen.dart';
import 'package:mobile/screens/tracking/confirm_trip_screen.dart';
import 'package:mobile/services/enhanced_notification_service.dart';
import 'package:mobile/services/background_service_manager.dart';
import 'package:mobile/services/notification_integration_service.dart';
import 'package:mobile/screens/researcher/enhanced_data_export_screen.dart';
import 'package:mobile/services/permission_service.dart';
import 'package:mobile/services/deep_link_service.dart';

// --- ROUTING CONFIGURATION ---
// Using go_router to handle all navigation, including deep links.
final GoRouter _router = GoRouter(
  navigatorKey: EnhancedNotificationService.navigatorKey,
  initialLocation: '/',
  routes: <RouteBase>[
    GoRoute(path: '/', builder: (context, state) => const SplashScreen()),
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(
        path: '/register', builder: (context, state) => const RegisterScreen()),
    GoRoute(
      path: '/verify-email',
      builder: (context, state) {
        final token = state.uri.queryParameters['token'];
        final email = state.uri.queryParameters['email'] ?? '';

        // FIX: Add debug logging
        debugPrint('🔗 DEEP LINK RECEIVED:');
        debugPrint('  - Full URI: ${state.uri}');
        debugPrint('  - Token: $token');
        debugPrint('  - Email: $email');
        debugPrint('  - All params: ${state.uri.queryParameters}');

        if (token == null || token.isEmpty) {
          debugPrint('❌ Invalid deep link - no token');
          return const Scaffold(
              body: Center(
                  child: Text(
                      "Invalid verification link. Please check your email and try again.")));
        }

        debugPrint('✅ Valid deep link - navigating to EmailVerificationScreen');
        return EmailVerificationScreen(email: email, token: token);
      },
    ),
    GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen()),
    GoRoute(
      path: '/reset-password',
      builder: (context, state) {
        final token = state.uri.queryParameters['token'];
        if (token == null) {
          return const Scaffold(
              body: Center(child: Text("Invalid password reset link.")));
        }
        return ResetPasswordScreen(token: token);
      },
    ),
    // --- NEW: Route for confirming a passively tracked trip ---
    GoRoute(
      path: '/confirm-trip/:tripId',
      builder: (context, state) {
        final tripId = state.pathParameters['tripId']!;
        final detectedMode = state.uri.queryParameters['mode']!;
        return ConfirmTripScreen(tripId: tripId, detectedMode: detectedMode);
      },
    ),
    GoRoute(path: '/home', builder: (context, state) => const MainScaffold()),
    // Update your routes to use the enhanced export screen:
    GoRoute(
      path: '/researcher/data-export',
      builder: (context, state) => const EnhancedDataExportScreen(),
    ),
  ],
);

// --- APP INITIALIZATION ---
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint('Firebase initialization failed: $e');
  }

  // Request all permissions on app start (non-blocking)
  PermissionService.requestAllPermissions().catchError((e) {
    debugPrint('Permission request failed: $e');
    return false; // Return false to indicate failure
  });

  // ✅ ADDED: Create the provider container before the app starts.
  final container = ProviderContainer();

  // Initialize services with timeout and error handling
  _initializeServicesWithTimeout(container);

  // Initialize deep link service
  DeepLinkService().initialize(_router);

  runApp(
    // ✅ ADDED: Use UncontrolledProviderScope to pass the existing container
    // to the widget tree.
    UncontrolledProviderScope(
      container: container,
      child: const MyApp(),
    ),
  );
}

/// Initialize services with timeout to prevent app hanging
Future<void> _initializeServicesWithTimeout(ProviderContainer container) async {
  // Initialize services in background without blocking app startup
  Future.microtask(() async {
    try {
      // Initialize enhanced notification service with timeout
      await container
          .read(enhancedNotificationServiceProvider)
          .initialize()
          .timeout(const Duration(seconds: 10));

      // Initialize background service manager with timeout
      await BackgroundServiceManager.instance
          .initialize()
          .timeout(const Duration(seconds: 5));

      await BackgroundServiceManager.instance
          .startNotificationChecking()
          .timeout(const Duration(seconds: 5));

      // Initialize notification integration service with timeout
      await NotificationIntegrationService.instance
          .initialize()
          .timeout(const Duration(seconds: 10));

      debugPrint('✅ All services initialized successfully');
    } catch (e) {
      debugPrint('⚠️ Service initialization failed (app will continue): $e');
    }
  });
}

// --- ROOT WIDGET ---
// ✅ CHANGED: MyApp is now a ConsumerWidget to follow Riverpod best practices.
class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  // ✅ CHANGED: The build method now includes 'WidgetRef ref'.
  Widget build(BuildContext context, WidgetRef ref) {
    return StyledToast(
      locale: const Locale('en', 'US'),
      child: MaterialApp.router(
        routerConfig: _router,
        title: 'WayMate',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          visualDensity: VisualDensity.adaptivePlatformDensity,
          textTheme: GoogleFonts.poppinsTextTheme(),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0E3B4C),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30)),
              textStyle: GoogleFonts.poppins(fontWeight: FontWeight.bold),
            ),
          ),
        ),
        debugShowCheckedModeBanner: false,
        // ❌ REMOVED: The incorrect builder and initialization logic has been removed.
      ),
    );
  }
}
