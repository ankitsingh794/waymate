import 'package:flutter/material.dart';
import 'package:mobile/services/auth_service.dart';
import 'package:mobile/utils/logger.dart';
import 'package:go_router/go_router.dart';
import 'dart:io';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> 
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  
  final AuthService _authService = AuthService();
  String _statusMessage = 'Initializing...';
  bool _isOfflineMode = false;
  bool _showOfflineDialog = false;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
    
    _animationController.forward();
    _checkAuthStatusAndNavigate();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _checkAuthStatusAndNavigate() async {
    await Future.delayed(const Duration(seconds: 1));

    try {
      // Step 1: Check network connectivity first
      setState(() => _statusMessage = 'Checking connectivity...');
      final hasInternet = await _hasInternetConnection();
      
      setState(() {
        _isOfflineMode = !hasInternet;
        _statusMessage = hasInternet 
          ? 'Connected to internet...' 
          : 'Offline mode detected...';
      });
      
      await Future.delayed(const Duration(milliseconds: 800));

      // Step 2: Check authentication with offline support
      setState(() => _statusMessage = 'Checking authentication...');
      
      if (hasInternet) {
        // Online mode - use existing refresh token logic
        await _handleOnlineAuthentication();
      } else {
        // Offline mode - use offline-aware authentication
        await _handleOfflineAuthentication();
      }
      
    } catch (e) {
      debugPrint('Splash auth check failed: $e');
      logger.e('Authentication check failed', error: e);
      
      setState(() => _statusMessage = 'Authentication error occurred');
      await Future.delayed(const Duration(milliseconds: 1500));
      
      if (mounted) {
        _navigateTo('/login');
      }
    }
  }

  Future<void> _handleOnlineAuthentication() async {
    try {
      final refreshToken = await _authService.getRefreshToken();
      
      if (refreshToken != null) {
        setState(() => _statusMessage = 'Validating session...');
        
        // Add timeout to prevent hanging on network issues
        final result = await _authService
            .refreshToken()
            .timeout(const Duration(seconds: 8));
        
        if (result['success']) {
          setState(() => _statusMessage = 'Welcome back!');
          await Future.delayed(const Duration(milliseconds: 800));
          _navigateTo('/home');
        } else {
          setState(() => _statusMessage = 'Session expired, please login');
          await Future.delayed(const Duration(milliseconds: 1000));
          _navigateTo('/login');
        }
      } else {
        setState(() => _statusMessage = 'Please login to continue');
        await Future.delayed(const Duration(milliseconds: 1000));
        _navigateTo('/login');
      }
    } catch (e) {
      // If online auth fails, fallback to offline check
      debugPrint('Online auth failed, trying offline: $e');
      await _handleOfflineAuthentication();
    }
  }

  Future<void> _handleOfflineAuthentication() async {
    try {
      // Check if user can access app in offline mode
      final canAccess = await _authService.canAccessApp();
      
      if (canAccess) {
        // User has valid offline session
        final userData = await _authService.getCachedUserData();
        final isOfflineSession = userData?['isOfflineSession'] ?? false;
        
        setState(() => _statusMessage = isOfflineSession 
          ? 'Welcome back (Offline)' 
          : 'Welcome back');
          
        await Future.delayed(const Duration(milliseconds: 1000));
        _navigateTo('/home');
      } else {
        // Check if user is authenticated but session expired
        final isAuth = await _authService.isAuthenticated();
        if (isAuth) {
          // User has token but offline session expired
          setState(() => _statusMessage = 'Offline session expired');
          await Future.delayed(const Duration(milliseconds: 800));
          _showOfflineSessionExpiredDialog();
        } else {
          // No authentication at all in offline mode
          setState(() => _statusMessage = 'Please connect to internet to sign in');
          await Future.delayed(const Duration(milliseconds: 1000));
          _showOfflineFirstTimeDialog();
        }
      }
    } catch (e) {
      debugPrint('Offline auth check failed: $e');
      setState(() => _statusMessage = 'Please connect to internet');
      await Future.delayed(const Duration(milliseconds: 1000));
      _navigateTo('/login');
    }
  }

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

  void _showOfflineSessionExpiredDialog() {
    if (!mounted) return;
    
    setState(() => _showOfflineDialog = true);
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.signal_cellular_off, color: Colors.orange),
            SizedBox(width: 8),
            Text('Offline Session Expired'),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Your offline session has expired (7 days limit).',
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 16),
            Text('To continue using the app:'),
            SizedBox(height: 8),
            Text('• Connect to the internet'),
            Text('• Sign in to refresh your session'),
            Text('• You\'ll then have another 7 days offline'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              setState(() => _showOfflineDialog = false);
              _checkAuthStatusAndNavigate(); // Retry
            },
            child: const Text('Retry'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              setState(() => _showOfflineDialog = false);
              _navigateTo('/login');
            },
            child: const Text('Go to Login'),
          ),
        ],
      ),
    );
  }

  void _showOfflineFirstTimeDialog() {
    if (!mounted) return;
    
    setState(() => _showOfflineDialog = true);
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.signal_cellular_off, color: Colors.orange),
            SizedBox(width: 8),
            Text('Offline Mode'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'You are currently offline. To access the app, you need to:',
              style: TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 16),
            const Text('• Connect to the internet'),
            const Text('• Sign in to cache your session'),
            const Text('• Then you can use the app offline for up to 7 days'),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.blue, size: 20),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Offline sessions enhance security by requiring periodic re-authentication.',
                      style: TextStyle(fontSize: 12, color: Colors.blue),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              setState(() => _showOfflineDialog = false);
              _checkAuthStatusAndNavigate(); // Retry
            },
            child: const Text('Retry'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              setState(() => _showOfflineDialog = false);
              _navigateTo('/login');
            },
            child: const Text('Go to Login'),
          ),
        ],
      ),
    );
  }

  void _navigateTo(String routeName) {
    if (mounted && !_showOfflineDialog) {
      context.go(routeName);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Theme.of(context).colorScheme.primary,
              Theme.of(context).colorScheme.secondary,
            ],
          ),
        ),
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // App Logo
                Image.asset('assets/images/logo.png', width: 200),
                
                const SizedBox(height: 60),
                
                // Status Message with Connectivity Indicator
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(25),
                    border: Border.all(
                      color: Colors.white.withOpacity(0.2),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (_isOfflineMode) ...[
                        const Icon(
                          Icons.signal_cellular_off,
                          color: Colors.orange,
                          size: 16,
                        ),
                        const SizedBox(width: 8),
                      ] else if (_statusMessage.contains('Connected')) ...[
                        const Icon(
                          Icons.signal_cellular_4_bar,
                          color: Colors.green,
                          size: 16,
                        ),
                        const SizedBox(width: 8),
                      ],
                      Flexible(
                        child: Text(
                          _statusMessage,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Loading Indicator
                const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}