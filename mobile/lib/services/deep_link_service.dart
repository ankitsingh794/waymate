// lib/services/deep_link_service.dart

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:app_links/app_links.dart';
import 'package:go_router/go_router.dart';

/// Service to handle deep links from external sources (email, browser, etc.)
class DeepLinkService {
  static final DeepLinkService _instance = DeepLinkService._internal();
  factory DeepLinkService() => _instance;
  DeepLinkService._internal();

  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSubscription;
  GoRouter? _router;

  /// Initialize deep link handling
  Future<void> initialize(GoRouter router) async {
    _router = router;

    try {
      debugPrint('🔗 Initializing deep link service...');

      // Handle initial link when app is opened from deep link
      final initialLink = await _appLinks.getInitialLink();
      if (initialLink != null) {
        debugPrint('🔗 Initial deep link found: $initialLink');
        await _handleDeepLink(initialLink);
      } else {
        debugPrint('🔗 No initial deep link found');
      }

      // Listen for incoming links when app is already running
      _linkSubscription = _appLinks.uriLinkStream.listen(
        (Uri uri) {
          debugPrint('🔗 Incoming deep link received: $uri');
          _handleDeepLink(uri);
        },
        onError: (err) {
          debugPrint('❌ Deep link stream error: $err');
        },
      );

      debugPrint('✅ Deep link service initialized successfully');
    } catch (e) {
      debugPrint('❌ Failed to initialize deep link service: $e');
      rethrow;
    }
  }

  /// Handle incoming deep link
  Future<void> _handleDeepLink(Uri uri) async {
    try {
      debugPrint('🔗 Processing deep link: $uri');
      debugPrint('  - Scheme: ${uri.scheme}');
      debugPrint('  - Host: ${uri.host}');
      debugPrint('  - Path: ${uri.path}');
      debugPrint('  - Query: ${uri.query}');
      debugPrint('  - Params: ${uri.queryParameters}');

      if (_router == null) {
        debugPrint('❌ Router not initialized');
        return;
      }

      // Handle waymate:// scheme
      if (uri.scheme == 'waymate') {
        await _handleCustomSchemeLink(uri);
      }
      // Handle https://waymate.vercel.app links
      else if (uri.scheme == 'https' && uri.host == 'waymate.vercel.app') {
        await _handleHttpsLink(uri);
      } else {
        debugPrint('❌ Unhandled deep link scheme: ${uri.scheme}');
      }
    } catch (e) {
      debugPrint('❌ Error handling deep link: $e');
    }
  }

  /// Handle custom scheme links (waymate://)
  Future<void> _handleCustomSchemeLink(Uri uri) async {
    debugPrint('🔗 Processing custom scheme link...');
    debugPrint('  - Full URI: $uri');
    debugPrint('  - Scheme: ${uri.scheme}');
    debugPrint('  - Host: ${uri.host}');
    debugPrint('  - Path: ${uri.path}');
    debugPrint('  - Query: ${uri.query}');
    debugPrint('  - Query Parameters: ${uri.queryParameters}');

    final path = uri.host; // In waymate://verify-email, host is 'verify-email'

    switch (path) {
      case 'verify-email':
        final token = uri.queryParameters['token'];
        final email = uri.queryParameters['email'];

        debugPrint('🔗 Email verification link detected');
        debugPrint('  - Token: $token');
        debugPrint('  - Email: $email');

        if (token != null && token.isNotEmpty) {
          final route = '/verify-email?token=$token&email=${email ?? ''}';
          debugPrint('✅ Navigating to: $route');
          _router!.go(route);
        } else {
          debugPrint('❌ Invalid verification link - missing token');
        }
        break;

      case 'reset-password':
        final token = uri.queryParameters['token'];

        if (token != null && token.isNotEmpty) {
          debugPrint('✅ Navigating to reset password: token=$token');
          _router!.go('/reset-password?token=$token');
        } else {
          debugPrint('❌ Invalid reset link - missing token');
        }
        break;

      case 'confirm-trip':
        final tripId = uri.queryParameters['tripId'];
        final mode = uri.queryParameters['mode'];

        if (tripId != null && mode != null) {
          debugPrint(
              '✅ Navigating to confirm trip: tripId=$tripId, mode=$mode');
          _router!.go('/confirm-trip/$tripId?mode=$mode');
        } else {
          debugPrint('❌ Invalid trip confirmation link');
        }
        break;

      default:
        debugPrint('❌ Unknown custom scheme path: $path');
        break;
    }
  }

  /// Handle HTTPS links (https://waymate.vercel.app)
  Future<void> _handleHttpsLink(Uri uri) async {
    final path = uri.path;

    switch (path) {
      case '/verify-email':
        final token = uri.queryParameters['token'];
        final email = uri.queryParameters['email'];

        if (token != null && token.isNotEmpty) {
          debugPrint(
              '✅ Navigating to email verification via HTTPS: token=$token, email=$email');
          _router!.go('/verify-email?token=$token&email=${email ?? ''}');
        } else {
          debugPrint('❌ Invalid HTTPS verification link - missing token');
        }
        break;

      case '/reset-password':
        final token = uri.queryParameters['token'];

        if (token != null && token.isNotEmpty) {
          debugPrint('✅ Navigating to reset password via HTTPS: token=$token');
          _router!.go('/reset-password?token=$token');
        } else {
          debugPrint('❌ Invalid HTTPS reset link - missing token');
        }
        break;

      default:
        debugPrint('❌ Unknown HTTPS path: $path');
        break;
    }
  }

  /// Dispose resources
  void dispose() {
    _linkSubscription?.cancel();
    _linkSubscription = null;
    _router = null;
    debugPrint('✅ Deep link service disposed');
  }
}
