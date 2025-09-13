import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/services/tracking_service.dart';

class ConfirmTripScreen extends StatefulWidget {
  final String tripId;
  final String detectedMode;

  const ConfirmTripScreen({
    super.key,
    required this.tripId,
    required this.detectedMode,
  });

  @override
  State<ConfirmTripScreen> createState() => _ConfirmTripScreenState();
}

class _ConfirmTripScreenState extends State<ConfirmTripScreen> {
  final TrackingService _trackingService = TrackingService();
  TransportationMode? _selectedMode;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Pre-select the AI's detected mode
    _selectedMode = TransportationMode.values.firstWhere(
      (e) => e.name == widget.detectedMode,
      orElse: () => TransportationMode.unknown,
    );
  }

  Future<void> _submitConfirmation() async {
    if (_selectedMode == null) return;
    setState(() => _isLoading = true);
    try {
      await _trackingService.submitTripCorrection(widget.tripId, _selectedMode!);
      if(mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Thank you for your feedback!')));
        Navigator.of(context).pop();
      }
    } catch (e) {
      if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: ${e.toString()}')));
    } finally {
      if(mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Confirm Trip Details', style: GoogleFonts.poppins())),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            const Text('We detected a trip you recently took. Please confirm the mode of transport to improve our accuracy.', textAlign: TextAlign.center),
            const SizedBox(height: 24),
            // In a real app, you would show a map of the trip path here.
            DropdownButtonFormField<TransportationMode>(
              initialValue: _selectedMode,
              items: TransportationMode.values.map((mode) => DropdownMenuItem(
                value: mode,
                child: Text(mode.name.replaceAll('_', ' ').toUpperCase()),
              )).toList(),
              onChanged: (value) => setState(() => _selectedMode = value),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _isLoading ? null : _submitConfirmation,
              child: _isLoading ? const CircularProgressIndicator() : const Text('Confirm'),
            ),
          ],
        ),
      ),
    );
  }
}