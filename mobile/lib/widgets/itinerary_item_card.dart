// lib/widgets/itinerary_item_card.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class ItineraryItemCard extends StatelessWidget {
  final Map<String, dynamic> itemData;
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

  String _formatTime(String isoDate) {
    return DateFormat.jm().format(DateTime.parse(isoDate));
  }

  @override
  Widget build(BuildContext context) {
    final type = itemData['type'] ?? 'activity';
    final startTime = _formatTime(itemData['startTime']);
    final description = itemData['description'] ?? 'No description';

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Timeline Column with Icon and Line
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
          // Content Column
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  startTime,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    color: Colors.black54,
                  ),
                ),
                Text(
                  description,
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 24), // Space between items
              ],
            ),
          ),
        ],
      ),
    );
  }
}