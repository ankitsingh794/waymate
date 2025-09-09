// lib/widgets/place_card.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class PlaceCard extends StatelessWidget {
  final Map<String, dynamic> placeData;
  const PlaceCard({super.key, required this.placeData});

  @override
  Widget build(BuildContext context) {
    final String name = placeData['name'] ?? 'Unknown Place';
    final String imageUrl = placeData['image'] ?? 'https://via.placeholder.com/150';
    final double rating = (placeData['rating'] ?? 0).toDouble();

    return SizedBox(
      width: 160,
      child: Card(
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Image.network(
              imageUrl,
              height: 100,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => const Center(child: Icon(Icons.image_not_supported)),
            ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Text(
                name,
                style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
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
                    Icon(Icons.star, color: Colors.amber, size: 16),
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