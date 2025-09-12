// lib/widgets/itinerary_item_card.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/trip_models.dart';

class ItineraryItemCard extends StatelessWidget {
  final ItineraryItem itemData;
  final bool isLastItem;

  const ItineraryItemCard({
    super.key,
    required this.itemData,
    this.isLastItem = false,
  });

  IconData _getIconForType(String type) {
    switch (type) {
      case 'activity':
        return Icons.local_activity_outlined;
      case 'travel':
        return Icons.directions_car_outlined;
      case 'food':
        return Icons.restaurant_outlined;
      case 'accommodation':
        return Icons.hotel_outlined;
      default:
        return Icons.place_outlined;
    }
  }

  String _formatTime(DateTime date) {
    return DateFormat.jm().format(date);
  }

  @override
  Widget build(BuildContext context) {
    final type = itemData.type;
    
    // --- FIXED: Handle the case where startTime can be null ---
    final String startTime = itemData.startTime != null
        ? _formatTime(itemData.startTime!)
        : 'No time specified';
        
    // --- FIXED: Provide a default value if description is null ---
    final String description = itemData.description ?? 'No description provided.';

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Column(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Theme.of(context).primaryColor.withOpacity(0.1),
                ),
                child: Icon(
                  _getIconForType(type),
                  color: Theme.of(context).primaryColor,
                  size: 24,
                ),
              ),
              if (!isLastItem)
                Expanded(
                  child: Container(
                    width: 2,
                    color: Theme.of(context).primaryColor.withOpacity(0.1),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              // Aligns the content to the top of the row instead of center
              mainAxisAlignment: MainAxisAlignment.start,
              children: [
                const SizedBox(height: 8), // Added padding for alignment
                Text(
                  startTime,
                  style: GoogleFonts.poppins(fontSize: 14, color: Colors.black54),
                ),
                Text(
                  description, // This is now guaranteed to be a non-null String
                  style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                // Using a Spacer to push the Divider to the bottom
                const Spacer(),
                const Divider(height: 1, thickness: 1),
              ],
            ),
          ),
        ],
      ),
    );
  }
}