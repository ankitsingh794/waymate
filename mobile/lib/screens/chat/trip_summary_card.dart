// lib/widgets/trip_summary_card.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/screens/trip_details/trip_details_screen.dart';

class TripSummaryCard extends StatelessWidget {
  final Map<String, dynamic> tripData;

  const TripSummaryCard({
    super.key,
    required this.tripData,
  });

  String _formatDateRange(String startDate, String endDate) {
    final start = DateTime.parse(startDate);
    final end = DateTime.parse(endDate);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    final startMonth = months[start.month - 1];
    final endMonth = months[end.month - 1];

    if (startMonth == endMonth) {
      return '$startMonth ${start.day} - ${end.day}, ${end.year}';
    }
    return '$startMonth ${start.day} - $endMonth ${end.day}, ${end.year}';
  }

  @override
  Widget build(BuildContext context) {
    // --- DATA EXTRACTION ---
    final String tripId = tripData['_id'];
    final String destination = tripData['destinationName'] ?? 'Unknown Location';
    final String startDate = tripData['dates']['start'];
    final String endDate = tripData['dates']['end'];
    final String coverImageUrl = tripData['coverImage'];
    final List<String> highlights = List<String>.from(tripData['highlights'] ?? []);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      clipBehavior: Clip.antiAlias, // Ensures the image respects the border radius
      elevation: 4,
      child: InkWell(
        // --- FIXED: The entire card is now tappable and navigates correctly ---
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              // The TripDetailsScreen requires the 'tripId', not the whole map.
              builder: (context) => TripDetailsScreen(tripId: tripId),
            ),
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // --- UI REFACTORED FOR COMPACTNESS ---
            Image.network(
              coverImageUrl,
              height: 150,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) =>
                  const SizedBox(height: 150, child: Center(child: Icon(Icons.image_not_supported))),
            ),
            Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    destination,
                    style: GoogleFonts.poppins(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.calendar_today, color: Colors.grey.shade600, size: 14),
                      const SizedBox(width: 8),
                      Text(
                        _formatDateRange(startDate, endDate),
                        style: GoogleFonts.poppins(
                          color: Colors.grey.shade800,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                  if (highlights.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.star, color: Colors.amber, size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            highlights.first, // Show only the first highlight for brevity
                            style: GoogleFonts.poppins(
                              color: Colors.grey.shade700,
                              fontSize: 13,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ]
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}