// lib/screens/auth/email_verification_screen.dart

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lottie/lottie.dart';
import 'package:mobile/screens/core/main_scaffold.dart';
import 'package:mobile/services/auth_service.dart';

class EmailVerificationScreen extends StatefulWidget {
  final String email;
  final String? token;

  const EmailVerificationScreen({
    super.key,
    required this.email,
    this.token,
  });

  @override
  State<EmailVerificationScreen> createState() =>
      _EmailVerificationScreenState();
}

class _EmailVerificationScreenState extends State<EmailVerificationScreen> {
  final _authService = AuthService();

  // 3. Update initial state for the "check your email" view
  String _statusMessage =
      'Please check your email to find the verification link.';
  bool _isVerified = false;
  bool _hasError = false;
  bool _isLoading = false; // Start with no loading indicator

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // FIX: Only try to verify if a token was actually provided (from a deep link)
      if (widget.token != null && widget.token!.isNotEmpty) {
        debugPrint('🔗 Deep link verification - Token: ${widget.token}');
        _handleVerification();
      } else {
        // If no token, we just landed here from registration
        debugPrint('📧 Registration flow - showing email check message');
        setState(() {
          _hasError = false; // FIX: Don't show as error, just instruction
          _statusMessage =
              'Please check your email for the verification link and tap it to verify your account.';
        });
      }
    });
  }

  Future<void> _handleVerification() async {
    // This function is now only called when a real token exists.
    setState(() => _isLoading = true); // Show loading indicator
    final result =
        await _authService.verifyEmail(widget.token!); // We can safely use '!'

    if (!mounted) return;

    if (result['success']) {
      setState(() {
        _isLoading = false;
        _isVerified = true;
        _hasError = false; // Turn off error state
        _statusMessage = 'Success! You are now logged in. Redirecting...';
      });

      Timer(const Duration(seconds: 4), () {
        if (mounted) {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (context) => const MainScaffold()),
            (route) => false,
          );
        }
      });
    } else {
      setState(() {
        _isLoading = false;
        _hasError = true;
        _statusMessage = result['message'] ??
            'Verification failed. The link may be invalid or expired.';
      });
    }
  }

  void _handleResendEmail() async {
    final result = await _authService.resendVerificationEmail(widget.email);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
          content: Text(
              result['message'] ?? 'A new verification email has been sent.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color.fromARGB(255, 87, 184, 203),
              Color.fromARGB(255, 14, 59, 76),
            ],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                _buildVisuals(), // Helper for showing animation/icon
                const SizedBox(height: 32),
                Text(
                  _getHeadlineText(),
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                Text(
                  _statusMessage,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(
                      color:
                          _hasError ? Colors.yellow.shade200 : Colors.white70,
                      fontSize: 16),
                ),
                const SizedBox(height: 40),
                // FIX: Show different buttons based on the state
                if (_hasError && widget.token != null)
                  // Show retry button only if verification failed
                  ElevatedButton(
                    onPressed: _handleVerification,
                    child: const Text('Retry Verification'),
                  )
                else if (widget.token == null)
                  // Show resend button only if in "check email" mode
                  Column(
                    children: [
                      TextButton(
                        onPressed: _handleResendEmail,
                        child: Text(
                          'Resend Verification Email',
                          style: GoogleFonts.poppins(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            decoration: TextDecoration.underline,
                            decorationColor: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      TextButton(
                        onPressed: () =>
                            Navigator.pushReplacementNamed(context, '/login'),
                        child: Text(
                          'Back to Login',
                          style: GoogleFonts.poppins(
                            color: Colors.white70,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // --- NEW: Helper widget to decide which visual to show ---
  Widget _buildVisuals() {
    if (_isLoading) {
      return const CircularProgressIndicator(color: Colors.white);
    }
    if (_isVerified) {
      return Lottie.asset('assets/animations/cat done.json',
          width: 200, height: 200);
    }
    if (_hasError) {
      return Lottie.asset('assets/animations/cat.json',
          width: 200, height: 200);
    }
    // FIX: Add default state for "check email" mode
    return const Icon(
      Icons.email_outlined,
      size: 120,
      color: Colors.white,
    );
  }

  // --- NEW: Helper to get the correct headline text ---
  String _getHeadlineText() {
    if (_isVerified) return 'Successfully Verified!';
    if (_hasError) return 'Verification Failed';
    if (_isLoading) return 'Verifying Your Email...';
    // FIX: Add headline for "check email" mode
    return 'Check Your Email';
  }
}
