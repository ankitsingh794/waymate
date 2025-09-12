import 'package:flutter/material.dart';
import 'package:mobile/services/auth_service.dart';
import 'package:go_router/go_router.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuthStatusAndNavigate();
  }

  Future<void> _checkAuthStatusAndNavigate() async {
    await Future.delayed(const Duration(seconds: 1));

    final authService = AuthService();
    final refreshToken = await authService.getRefreshToken();

    if (!mounted) return;

    if (refreshToken != null) {
      final result = await authService.refreshToken();
      if (result['success']) {
        _navigateTo('/home');
      } else {
        _navigateTo('/login');
      }
    } else {
      _navigateTo('/login');
    }
  }

  void _navigateTo(String routeName) {
  if (mounted) {
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
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Image.asset('assets/images/logo.png', width: 200),
              const SizedBox(height: 48),
              const CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
