// lib/widgets/tracking_nudge_card.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/services/tracking_events.dart';
import 'package:mobile/services/passive_tracking_manager.dart';

class TrackingNudgeCard extends StatefulWidget {
  const TrackingNudgeCard({super.key});

  @override
  State<TrackingNudgeCard> createState() => _TrackingNudgeCardState();
}

class _TrackingNudgeCardState extends State<TrackingNudgeCard> {
  final PassiveTrackingManager _trackingManager = PassiveTrackingManager();
  StreamSubscription? _eventSubscription;
  TrackingEvent? _currentEvent;

  @override
  void initState() {
    super.initState();
    _eventSubscription = _trackingManager.trackingEvents.listen((event) {
      if (mounted) setState(() => _currentEvent = event);
    });
  }

  @override
  void dispose() {
    _eventSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_currentEvent is ShowTripStartNudge) {
      final event = _currentEvent as ShowTripStartNudge;
      return Card(
        margin: const EdgeInsets.all(12.0),
        elevation: 8,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Start a new trip?', style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(
                'It looks like you started traveling via ${event.predictedActivity.type.name}. Would you like to track this trip?',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  TextButton(
                    onPressed: () => _trackingManager.userCancelledTripStart(event.temporaryTripId),
                    child: const Text('No'),
                  ),
                  ElevatedButton(
                    onPressed: () => _trackingManager.userConfirmedTripStart(event.temporaryTripId),
                    child: const Text('Yes, Start Tracking'),
                  ),
                ],
              )
            ],
          ),
        ),
      );
    }
    return const SizedBox.shrink();
  }
}