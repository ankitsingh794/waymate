// lib/screens/welcome/animated_stars_background.dart

import 'dart:math';
import 'package:flutter/material.dart';
import 'package:simple_animations/simple_animations.dart';

class AnimatedStarsBackground extends StatelessWidget {
  const AnimatedStarsBackground({super.key});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF1A1A2E), Color(0xFF16213E)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
        ),
        ...List.generate(50, (index) => const Particle()),
      ],
    );
  }
}

class Particle extends StatefulWidget {
  const Particle({super.key});

  @override
  State<Particle> createState() => _ParticleState();
}

class _ParticleState extends State<Particle> with TickerProviderStateMixin {
  // REMOVED 'final' KEYWORD FROM THESE LINES
  late double _size;
  late Duration _duration;
  late Duration _delay;
  late double _startX;
  late double _startY;

  @override
  void initState() {
    super.initState();
    final random = Random();
    _size = random.nextDouble() * 2.5 + 0.5;
    _duration = Duration(milliseconds: random.nextInt(8000) + 4000);
    _delay = Duration(milliseconds: random.nextInt(4000));
    _startX = random.nextDouble();
    _startY = random.nextDouble();
  }

  @override
  Widget build(BuildContext context) {
    return LoopAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: _duration,
      builder: (context, value, child) {
        final t =
            ((value + _delay.inMilliseconds / _duration.inMilliseconds) % 1);
        final x = _startX * MediaQuery.of(context).size.width;
        final y = (_startY - t) * MediaQuery.of(context).size.height;
        final opacity = sin(t * pi);

        return Positioned(
          left: x,
          top: y,
          child: Opacity(
            opacity: opacity,
            child: Container(
              width: _size,
              height: _size,
              decoration: const BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
              ),
            ),
          ),
        );
      },
    );
  }
}
