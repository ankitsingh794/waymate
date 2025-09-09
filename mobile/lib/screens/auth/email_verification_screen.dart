// lib/screens/auth/email_verification_screen.dart

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lottie/lottie.dart';
import 'package:mobile/screens/core/main_scaffold.dart';
import 'package:mobile/services/auth_service.dart';

class EmailVerificationScreen extends StatefulWidget {
  final String email;
  const EmailVerificationScreen({super.key, required this.email});

  @override
  State<EmailVerificationScreen> createState() =>
      _EmailVerificationScreenState();
}

class _EmailVerificationScreenState extends State<EmailVerificationScreen> {
  final _tokenController = TextEditingController();
  final _authService = AuthService();
  bool _isLoading = false;
  bool _isVerified = false;

  void _handleVerification() async {
     if (_tokenController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the verification token from the URL in your email.')),
      );
      return;
    }
    
    setState(() => _isLoading = true);

    // NOTE: In a real app, you would use deep linking to get the token automatically.
    // Here we use a text field for manual entry.
    final result = await _authService.verifyEmail(_tokenController.text.trim());

    if (!mounted) return;
    
    setState(() => _isLoading = false);

    if (result['success']) {
      setState(() => _isVerified = true);
       ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Success! You are now logged in.')),
      );
      // Wait a bit to show success animation, then navigate
      Timer(const Duration(seconds: 4), () {
        if(mounted){
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (context) => const MainScaffold()),
            (route) => false, 
          );
        }
      });
    } else {
       ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message'] ?? 'Verification failed.')),
      );
    }
  }

  void _handleResendEmail() async {
    setState(() => _isLoading = true);
    final result = await _authService.resendVerificationEmail(widget.email);
    if (!mounted) return;
    setState(() => _isLoading = false);

     ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(result['message'] ?? 'A request has been sent.')),
    );
  }

  @override
  void dispose() {
    _tokenController.dispose();
    super.dispose();
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
              const Color.fromARGB(255, 87, 184, 203),
              const Color.fromARGB(255, 14, 59, 76),
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
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 500),
                  child: _isVerified
                      ? Lottie.asset('assets/animations/cat done.json', key: const ValueKey('verified'), width: 200, height: 200)
                      : Lottie.asset('assets/animations/cat.json', key: const ValueKey('sending'), width: 200, height: 200),
                ),
                const SizedBox(height: 32),
                Text(
                  _isVerified ? 'Successfully Verified!' : 'A verification email has been sent.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                Text(
                  _isVerified ? 'Redirecting you to the app...' : 'Please check your inbox, find the token in the verification URL, and paste it below.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(color: Colors.white70, fontSize: 16),
                ),
                const SizedBox(height: 40),
                if (!_isVerified) ...[
                  TextField(
                    controller: _tokenController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Verification Token',
                      labelStyle: const TextStyle(color: Colors.white70),
                      filled: true,
                      fillColor: Colors.white.withOpacity(0.1),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _handleVerification,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF16213E),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                      ),
                      child: _isLoading
                          ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 3, color: Color(0xFF16213E)))
                          : Text('Verify Email', style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(height: 20),
                  TextButton(
                    onPressed: _isLoading ? null : _handleResendEmail,
                    child: Text(
                      'Resend Email',
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        decoration: TextDecoration.underline,
                        decorationColor: Colors.white,
                      ),
                    ),
                  )
                ]
              ],
            ),
          ),
        ),
      ),
    );
  }
}
