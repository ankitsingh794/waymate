// lib/widgets/trip_summary_card.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/trip_models.dart';
import 'package:mobile/screens/trip_details/trip_details_screen.dart';

class TripSummaryCard extends StatelessWidget {
  final Trip tripData;

  const TripSummaryCard({
    super.key,
    required this.tripData,
  });

  String _formatDateRange(DateTime start, DateTime end) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];

    final startMonth = months[start.month - 1];
    final endMonth = months[end.month - 1];

    if (startMonth == endMonth) {
      return '$startMonth ${start.day} - ${end.day}, ${end.year}';
    }
    return '$startMonth ${start.day} - $endMonth ${end.day}, ${end.year}';
  }

  String _calculateDuration(DateTime start, DateTime end) {
    final duration = end.difference(start).inDays + 1;
    return '$duration-Day Trip';
  }

  @override
  Widget build(BuildContext context) {
    // --- UPDATED: Accessing properties directly from the Trip model ---
    final String destination = tripData.destination;
    final DateTime startDate = tripData.startDate;
    final DateTime endDate = tripData.endDate;
    final List<String> highlights = tripData.aiSummary?.highlights ?? [];
    final String coverImageUrl =
        tripData.coverImage ?? 'https://via.placeholder.com/400';

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      elevation: 5,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => TripDetailsScreen(
                tripId: tripData.id,
              ),
            ),
          );
        },
        child: Stack(
          alignment: Alignment.bottomLeft,
          children: [
            Image.network(
              coverImageUrl,
              height: 250,
              width: double.infinity,
              fit: BoxFit.cover,
              loadingBuilder: (context, child, loadingProgress) {
                if (loadingProgress == null) return child;
                return const Center(child: CircularProgressIndicator());
              },
              errorBuilder: (context, error, stackTrace) {
                return const Center(
                    child: Icon(Icons.image_not_supported, color: Colors.grey));
              },
            ),
            Container(
              height: 250,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Colors.black.withOpacity(0.8)],
                  stops: const [0.5, 1.0],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    destination,
                    style: GoogleFonts.poppins(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      shadows: [
                        const Shadow(blurRadius: 2, color: Colors.black54)
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today,
                          color: Colors.white70, size: 14),
                      const SizedBox(width: 8),
                      Text(
                        _formatDateRange(startDate, endDate),
                        style: GoogleFonts.poppins(
                            color: Colors.white, fontSize: 14),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _calculateDuration(startDate, endDate),
                    style: GoogleFonts.poppins(
                        color: Colors.white70, fontSize: 12),
                  ),
                  const SizedBox(height: 12),
                  if (highlights.isNotEmpty)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.star_border,
                            color: Colors.white70, size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            highlights.join(' • '),
                            style: GoogleFonts.poppins(
                                color: Colors.white, fontSize: 14),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
            if (tripData.favorite)
              Positioned(
                top: 12,
                right: 12,
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.5),
                    shape: BoxShape.circle,
                  ),
                  child:
                      const Icon(Icons.favorite, color: Colors.red, size: 20),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
