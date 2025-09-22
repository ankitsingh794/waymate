// lib/widgets/tracking_nudge_card.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/services/tracking_events.dart';
import 'package:mobile/services/passive_tracking_manager.dart';
import 'package:mobile/services/tracking_service.dart';

class TrackingNudgeCard extends StatefulWidget {
  const TrackingNudgeCard({super.key});

  @override
  State<TrackingNudgeCard> createState() => _TrackingNudgeCardState();
}

class _TrackingNudgeCardState extends State<TrackingNudgeCard> {
  final PassiveTrackingManager _trackingManager = PassiveTrackingManager();
  final TrackingService _trackingService = TrackingService();
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
              Text('Start a new trip?',
                  style: GoogleFonts.poppins(
                      fontSize: 18, fontWeight: FontWeight.bold)),
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
                    onPressed: () => _trackingManager
                        .userCancelledTripStart(event.temporaryTripId),
                    child: const Text('No'),
                  ),
                  ElevatedButton(
                    onPressed: () => _trackingManager
                        .userConfirmedTripStart(event.temporaryTripId),
                    child: const Text('Yes, Start Tracking'),
                  ),
                ],
              )
            ],
          ),
        ),
      );
    }

    if (_currentEvent is TripConfirmationRequired) {
      final event = _currentEvent as TripConfirmationRequired;
      return Card(
        margin: const EdgeInsets.all(12.0),
        elevation: 8,
        color: Colors.orange.shade50,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.help_outline, size: 40, color: Colors.orange.shade700),
              const SizedBox(height: 8),
              Text('Trip Confirmation Needed',
                  style: GoogleFonts.poppins(
                      fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(
                event.message,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ElevatedButton.icon(
                    icon: Icon(Icons.check, color: Colors.white),
                    label: Text('Yes, this was a trip'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                    ),
                    onPressed: () async {
                      await _trackingManager.userConfirmedTrip(event.tripId);
                      setState(() => _currentEvent = null);
                    },
                  ),
                  const SizedBox(width: 16),
                  ElevatedButton.icon(
                    icon: Icon(Icons.close, color: Colors.white),
                    label: Text('No, delete this'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                    ),
                    onPressed: () async {
                      await _trackingManager.userRejectedTrip(event.tripId);
                      setState(() => _currentEvent = null);
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    if (_currentEvent is TripCompletedEvent) {
      final event = _currentEvent as TripCompletedEvent;
      return Card(
        margin: const EdgeInsets.all(12.0),
        elevation: 8,
        color: Colors.green.shade50,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.check_circle, size: 40, color: Colors.green.shade700),
              const SizedBox(height: 8),
              Text('Trip Completed!',
                  style: GoogleFonts.poppins(
                      fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(
                'Detected as ${event.mode} travel with ${event.accuracy.toStringAsFixed(0)}% confidence.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => setState(() => _currentEvent = null),
                child: const Text('Got it!'),
              ),
            ],
          ),
        ),
      );
    }

    return const SizedBox.shrink();
  }

  void _confirmTripMode(String tripId, String mode) async {
    try {
      // Call API to confirm trip mode
      await _trackingService.confirmTripMode(tripId, mode);

      // Hide the nudge
      setState(() => _currentEvent = null);

      // Show confirmation message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Trip confirmed as ${_getModeName(mode)} travel'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      // Show error message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to confirm trip: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Icon _getModeIcon(String mode) {
    switch (mode) {
      case 'walking':
        return const Icon(Icons.directions_walk, size: 16);
      case 'cycling':
        return const Icon(Icons.directions_bike, size: 16);
      case 'driving':
        return const Icon(Icons.directions_car, size: 16);
      case 'public_transport':
        return const Icon(Icons.directions_transit, size: 16);
      default:
        return const Icon(Icons.help_outline, size: 16);
    }
  }

  String _getModeName(String mode) {
    switch (mode) {
      case 'walking':
        return 'Walking';
      case 'cycling':
        return 'Cycling';
      case 'driving':
        return 'Driving';
      case 'public_transport':
        return 'Transit';
      default:
        return 'Unknown';
    }
  }
}
