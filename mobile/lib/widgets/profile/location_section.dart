// lib/widgets/profile/location_section.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class LocationSection extends StatelessWidget {
  final TextEditingController cityController;
  final TextEditingController countryController;
  final List<double>? coordinates;
  final bool isLoading;
  final ValueChanged<List<double>?> onLocationUpdate;
  final VoidCallback onSave;

  const LocationSection({
    super.key,
    required this.cityController,
    required this.countryController,
    this.coordinates,
    required this.isLoading,
    required this.onLocationUpdate,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Location Information',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Help us provide location-based recommendations and services',
            style: GoogleFonts.poppins(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // City Field
          TextFormField(
            controller: cityController,
            decoration: InputDecoration(
              labelText: 'City',
              prefixIcon: const Icon(Icons.location_city),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: Colors.grey[50],
              helperText: 'Enter your current city',
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Country Field
          TextFormField(
            controller: countryController,
            decoration: InputDecoration(
              labelText: 'Country',
              prefixIcon: const Icon(Icons.flag),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: Colors.grey[50],
              helperText: 'Enter your current country',
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Current Location Card
          if (coordinates != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green[200]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.gps_fixed, color: Colors.green[600]),
                      const SizedBox(width: 8),
                      Text(
                        'GPS Coordinates',
                        style: GoogleFonts.poppins(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.green[800],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Latitude: ${coordinates![1].toStringAsFixed(6)}',
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.grey,
                      fontFamily: 'monospace',
                    ),
                  ),
                  Text(
                    'Longitude: ${coordinates![0].toStringAsFixed(6)}',
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.grey,
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ),
            ),
          
          const SizedBox(height: 16),
          
          // Get Current Location Button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: OutlinedButton.icon(
              onPressed: () => _getCurrentLocation(context),
              icon: const Icon(Icons.my_location),
              label: Text(
                'Get Current Location',
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color.fromARGB(255, 87, 184, 203),
                side: const BorderSide(
                  color: Color.fromARGB(255, 87, 184, 203),
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Clear Location Button
          if (coordinates != null)
            SizedBox(
              width: double.infinity,
              height: 50,
              child: TextButton.icon(
                onPressed: () => onLocationUpdate(null),
                icon: const Icon(Icons.clear),
                label: Text(
                  'Clear Location Data',
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.red[600],
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          
          const SizedBox(height: 32),
          
          // Save Button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: isLoading ? null : onSave,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color.fromARGB(255, 87, 184, 203),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 2,
              ),
              child: isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      'Save Location',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Privacy Notice
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.amber[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.amber[200]!),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.privacy_tip_outlined, color: Colors.amber[700]),
                    const SizedBox(width: 8),
                    Text(
                      'Privacy Notice',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.amber[800],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Your location data is used to provide personalized travel recommendations and improve our services. You can update your privacy preferences in the Privacy tab.',
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    color: Colors.amber[800],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _getCurrentLocation(BuildContext context) {
    // This would typically use the geolocator package to get current location
    // For now, we'll show a placeholder dialog
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Get Current Location'),
        content: const Text(
          'This feature would use GPS to get your current location. '
          'Make sure to grant location permissions when prompted.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              // Simulate getting location
              onLocationUpdate([77.2090, 28.6139]); // Example: New Delhi coordinates
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Location updated! (This is a demo)'),
                  backgroundColor: Colors.green,
                ),
              );
            },
            child: const Text('Get Location'),
          ),
        ],
      ),
    );
  }
}