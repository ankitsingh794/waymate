// lib/widgets/place_card.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/trip_models.dart';

class PlaceCard extends StatelessWidget {
  // --- UPDATED: Changed to accept a strongly-typed Recommendation object ---
  final Recommendation placeData;
  const PlaceCard({super.key, required this.placeData});

  @override
  Widget build(BuildContext context) {
    // Access properties directly from the placeData object
    final String name = placeData.name;
    final String? imageUrl = placeData.image;
    final double rating = placeData.rating;

    return SizedBox(
      width: 160,
      child: Card(
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // --- UPDATED: Handles null image URL gracefully ---
            if (imageUrl != null)
              Image.network(
                imageUrl,
                height: 100,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => const SizedBox(
                  height: 100,
                  child: Center(child: Icon(Icons.image_not_supported)),
                ),
              )
            else
              const SizedBox(
                height: 100,
                child: Center(child: Icon(Icons.image_not_supported)),
              ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Text(
                name,
                style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 13),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const Spacer(),
            if (rating > 0)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
                child: Row(
                  children: [
                    const Icon(Icons.star, color: Colors.amber, size: 16),
                    const SizedBox(width: 4),
                    Text(rating.toString(), style: GoogleFonts.poppins()),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}