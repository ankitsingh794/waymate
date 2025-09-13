// lib/main_debug.dart - Simplified version for debugging

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
import 'package:mobile/screens/researcher/enhanced_data_export_screen.dart';

// Simple routing without enhanced notifications
final GoRouter _router = GoRouter(
  initialLocation: '/',
  routes: <RouteBase>[
    GoRoute(path: '/', builder: (context, state) => const SplashScreen()),
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(
      path: '/register',
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(
      path: '/email-verification',
      builder: (context, state) {
        final email = state.uri.queryParameters['email'];
        final token = state.uri.queryParameters['token'];

        if (email == null || token == null) {
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
    GoRoute(
      path: '/confirm-trip/:tripId',
      builder: (context, state) {
        final tripId = state.pathParameters['tripId']!;
        final detectedMode = state.uri.queryParameters['mode']!;
        return ConfirmTripScreen(tripId: tripId, detectedMode: detectedMode);
      },
    ),
    GoRoute(path: '/home', builder: (context, state) => const MainScaffold()),
    GoRoute(
      path: '/researcher/data-export',
      builder: (context, state) => const EnhancedDataExportScreen(),
    ),
  ],
);

// Simplified app initialization
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Firebase.initializeApp();
    debugPrint('✅ Firebase initialized successfully');
  } catch (e) {
    debugPrint('❌ Firebase initialization failed: $e');
  }

  runApp(
    ProviderScope(
      child: const MyAppDebug(),
    ),
  );
}

class MyAppDebug extends ConsumerWidget {
  const MyAppDebug({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return StyledToast(
      locale: const Locale('en', 'US'),
      child: MaterialApp.router(
        routerConfig: _router,
        title: 'WayMate Debug',
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
      ),
    );
  }
}
