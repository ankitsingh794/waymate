import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/services/trip_service.dart';

class JoinTripScreen extends StatefulWidget {
  const JoinTripScreen({super.key});

  @override
  State<JoinTripScreen> createState() => _JoinTripScreenState();
}

class _JoinTripScreenState extends State<JoinTripScreen> {
  final TextEditingController _tokenController = TextEditingController();
  final TripService _tripService = TripService();
  bool _isLoading = false;

  String? _selectedAgeGroup;
  String? _selectedGender;
  String? _selectedRelation;

  // FIX: Updated to match backend enum values from Trip.js
  final List<Map<String, String>> _ageGroups = [
    {'value': '<18', 'label': 'Under 18'},
    {'value': '18-35', 'label': '18-35'},
    {'value': '36-60', 'label': '36-60'},
    {'value': '>60', 'label': 'Over 60'},
  ];

  final List<Map<String, String>> _genders = [
    {'value': 'male', 'label': 'Male'},
    {'value': 'female', 'label': 'Female'},
    {'value': 'other', 'label': 'Other'},
    {'value': 'prefer_not_to_say', 'label': 'Prefer not to say'},
  ];

  // FIX: relation is just a String in the backend, so any value works
  // But let's provide common options
  final List<String> _relations = [
    'Family',
    'Friend',
    'Coworker',
    'Partner',
    'Spouse',
    'Sibling',
    'Parent',
    'Child',
    'Other'
  ];

  Future<void> _joinTrip() async {
    if (_tokenController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter an invite token')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final tripId = await _tripService.joinTripWithToken(
        _tokenController.text.trim(),
        ageGroup: _selectedAgeGroup,
        gender: _selectedGender,
        relation: _selectedRelation,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Successfully joined the trip!')),
        );

        // Navigate to trip details
        Navigator.pushReplacementNamed(
          context,
          '/trip-details',
          arguments: {'tripId': tripId},
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to join trip: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Join Trip', style: GoogleFonts.poppins()),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Enter Invite Token',
                      style: GoogleFonts.poppins(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Ask the trip organizer for an invite token and paste it below.',
                      style: GoogleFonts.poppins(color: Colors.grey.shade600),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _tokenController,
                      decoration: const InputDecoration(
                        labelText: 'Invite Token',
                        hintText: 'Paste the invite token here',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.vpn_key),
                      ),
                      maxLines: 1,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Optional Information',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'This helps the group plan better for the trip.',
                      style: GoogleFonts.poppins(
                        color: Colors.grey.shade600,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // FIX: Updated age group dropdown with correct enum values
                    DropdownButtonFormField<String>(
                      value: _selectedAgeGroup,
                      decoration: const InputDecoration(
                        labelText: 'Age Group',
                        border: OutlineInputBorder(),
                      ),
                      items: _ageGroups
                          .map((ageGroup) => DropdownMenuItem(
                                value: ageGroup['value'],
                                child: Text(ageGroup['label']!),
                              ))
                          .toList(),
                      onChanged: (value) =>
                          setState(() => _selectedAgeGroup = value),
                    ),
                    const SizedBox(height: 12),

                    // FIX: Updated gender dropdown with correct enum values
                    DropdownButtonFormField<String>(
                      value: _selectedGender,
                      decoration: const InputDecoration(
                        labelText: 'Gender',
                        border: OutlineInputBorder(),
                      ),
                      items: _genders
                          .map((gender) => DropdownMenuItem(
                                value: gender['value'],
                                child: Text(gender['label']!),
                              ))
                          .toList(),
                      onChanged: (value) =>
                          setState(() => _selectedGender = value),
                    ),
                    const SizedBox(height: 12),

                    // FIX: Relation is free text in backend, so keeping dropdown for UX
                    DropdownButtonFormField<String>(
                      value: _selectedRelation,
                      decoration: const InputDecoration(
                        labelText: 'Relationship to Organizer',
                        border: OutlineInputBorder(),
                      ),
                      items: _relations
                          .map((relation) => DropdownMenuItem(
                                value: relation,
                                child: Text(relation),
                              ))
                          .toList(),
                      onChanged: (value) =>
                          setState(() => _selectedRelation = value),
                    ),
                  ],
                ),
              ),
            ),
            const Spacer(),
            ElevatedButton(
              onPressed: _isLoading ? null : _joinTrip,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.all(16),
              ),
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : Text(
                      'Join Trip',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _tokenController.dispose();
    super.dispose();
  }
}
