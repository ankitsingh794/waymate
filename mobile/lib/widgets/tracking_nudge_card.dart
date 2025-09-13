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
                'We detected a trip by ${event.detectedMode}, but we\'re only ${event.accuracy.toStringAsFixed(0)}% confident.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Can you confirm the transportation mode?',
                textAlign: TextAlign.center,
                style: TextStyle(fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 16),
              _buildModeSelectionButtons(event.tripId, event.detectedMode),
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

  Widget _buildModeSelectionButtons(String tripId, String detectedMode) {
    final modes = ['walking', 'cycling', 'driving', 'public_transport'];

    return Wrap(
      spacing: 8.0,
      runSpacing: 8.0,
      children: modes.map((mode) {
        final isDetected = mode == detectedMode;
        return ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: isDetected ? Colors.orange.shade200 : null,
            foregroundColor: isDetected ? Colors.orange.shade800 : null,
          ),
          onPressed: () => _confirmTripMode(tripId, mode),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _getModeIcon(mode),
              const SizedBox(width: 4),
              Text(_getModeName(mode)),
              if (isDetected) ...[
                const SizedBox(width: 4),
                Icon(Icons.psychology, size: 16),
              ],
            ],
          ),
        );
      }).toList(),
    );
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
        return Icon(Icons.directions_walk, size: 16);
      case 'cycling':
        return Icon(Icons.directions_bike, size: 16);
      case 'driving':
        return Icon(Icons.directions_car, size: 16);
      case 'public_transport':
        return Icon(Icons.directions_transit, size: 16);
      default:
        return Icon(Icons.help_outline, size: 16);
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
