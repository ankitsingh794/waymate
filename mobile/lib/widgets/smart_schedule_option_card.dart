import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/trip_models.dart';

class SmartScheduleOptionCard extends StatelessWidget {
  final SmartScheduleOption optionData;
  final bool isRecommended;

  const SmartScheduleOptionCard({
    super.key,
    required this.optionData,
    this.isRecommended = false,
  });

  @override
  Widget build(BuildContext context) {
    // --- NEW: Using a Stack to add a "Recommended" banner ---
    return Stack(
      children: [
        Card(
          // --- NEW: A different border color for the recommended option ---
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(
              color: isRecommended ? Colors.green : Colors.transparent,
              width: 2,
            ),
          ),
          margin: const EdgeInsets.only(bottom: 16.0),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildTrainHeader(),
                const Divider(height: 24),
                _buildTimingRow(),
                const SizedBox(height: 16),
                _buildClassesAndReason(),
              ],
            ),
          ),
        ),
        // --- NEW: The "Recommended" banner widget ---
        if (isRecommended)
          const Positioned(
            top: 10,
            right: -15,
            child: Banner(
              message: "Recommended",
              location: BannerLocation.topEnd,
              color: Colors.green,
            ),
          ),
      ],
    );
  }

  Widget _buildTrainHeader() {
    return Row(
      children: [
        const Icon(Icons.train_outlined),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            optionData.trainName ?? 'Train Name Unavailable',
            style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ),
        Text(
          '#${optionData.trainNumber ?? 'N/A'}',
          style: GoogleFonts.poppins(color: Colors.grey.shade600),
        ),
      ],
    );
  }

  Widget _buildTimingRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _buildTimeColumn("Departure", optionData.departureTime),
        Column(
          children: [
            const Icon(Icons.arrow_right_alt, color: Colors.grey),
            Text(optionData.duration ?? '', style: GoogleFonts.poppins(fontSize: 12)),
          ],
        ),
        _buildTimeColumn("Arrival", optionData.arrivalTime),
      ],
    );
  }

  Widget _buildClassesAndReason() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Available Classes:',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
        ),
        // --- NEW: Displays available classes in a Wrap widget ---
        Wrap(
          spacing: 8.0,
          children: optionData.availableClasses
              .map((c) => Chip(label: Text(c)))
              .toList(),
        ),
        // --- NEW: Shows the reason for the recommendation ---
        if (isRecommended && optionData.recommendationReason != null)
          Padding(
            padding: const EdgeInsets.only(top: 12.0),
            child: Row(
              children: [
                const Icon(Icons.star_border, color: Colors.green, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    optionData.recommendationReason!,
                    style: GoogleFonts.poppins(color: Colors.green.shade800),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildTimeColumn(String title, String? time) {
    return Column(
      children: [
        Text(title, style: GoogleFonts.poppins(color: Colors.grey.shade600)),
        Text(
          time ?? 'N/A',
          style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}