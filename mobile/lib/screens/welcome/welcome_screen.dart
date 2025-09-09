// lib/screens/welcome/welcome_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/screens/auth/login_screen.dart';
import 'package:mobile/screens/welcome/animated_stars_background.dart';
import 'package:lottie/lottie.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _lottieController;

  @override
  void initState() {
    super.initState();
    _lottieController = AnimationController(vsync: this);
  }

  @override
  void dispose() {
    _lottieController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Animated starfield background
          const AnimatedStarsBackground(),

          // Lottie Globe Animation (slightly zoomed in)
          Positioned(
            bottom: 250,
            left: 0,
            right: 0,
            child: SizedBox(
              height: 350,
              child: Transform.scale(
                scale: 1.2, // <--- zoom in a little (1.0 = normal)
                child: Lottie.asset(
                  'assets/animations/earth.json',
                  controller: _lottieController,
                  onLoaded: (composition) {
                    _lottieController
                      ..duration = composition.duration * 2 // slow spin
                      ..repeat();
                  },
                ),
              ),
            ),
          ),

          // UI elements
          SafeArea(
            child: Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 24.0, vertical: 40.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Waymate',
                    style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontSize: 42,
                        fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Your AI Travel Assistant',
                    style: GoogleFonts.poppins(
                        color: Colors.white70, fontSize: 20),
                  ),
                  const Spacer(),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (context) => const LoginScreen()),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF16213E),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(30)),
                      ),
                      child: Text(
                        'Get Started',
                        style: GoogleFonts.poppins(
                            fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
