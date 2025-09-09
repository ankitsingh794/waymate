// lib/widgets/smart_schedule_option_card.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SmartScheduleOptionCard extends StatelessWidget {
  final Map<String, dynamic> optionData;
  final bool isRecommended;

  const SmartScheduleOptionCard({
    super.key,
    required this.optionData,
    this.isRecommended = false,
  });

  @override
  Widget build(BuildContext context) {
    final String trainName = optionData['trainName'] ?? 'N/A';
    final String departureTime = optionData['departureTime'] ?? '';
    final String arrivalTime = optionData['arrivalTime'] ?? '';
    final String duration = optionData['duration'] ?? '';
    final String reason = optionData['recommendationReason'] ?? '';

    return Card(
      margin: const EdgeInsets.only(bottom: 16.0),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isRecommended
            ? BorderSide(color: Theme.of(context).primaryColor, width: 2)
            : BorderSide.none,
      ),
      elevation: isRecommended ? 4 : 2,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(trainName, style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildTimeColumn('Departure', departureTime),
                    _buildTimeColumn('Arrival', arrivalTime),
                    _buildTimeColumn('Duration', duration, isBold: true),
                  ],
                ),
              ],
            ),
          ),
          if (isRecommended)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor.withOpacity(0.1),
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
              ),
              child: Text(
                '✨ AI Recommendation: $reason',
                style: GoogleFonts.poppins(color: Theme.of(context).primaryColorDark),
              ),
            )
        ],
      ),
    );
  }

  Widget _buildTimeColumn(String label, String value, {bool isBold = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600)),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.poppins(
            fontSize: 16,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }
}