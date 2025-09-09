import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class PlaceResultCard extends StatelessWidget {
  final Map<String, dynamic> placeData;
  const PlaceResultCard({super.key, required this.placeData});

  @override
  Widget build(BuildContext context) {
    final String name = placeData['name'] ?? 'Unknown Place';
    final String address = placeData['address'] ?? 'No address provided';
    final String reason = placeData['reason'] ?? 'No details available.';
    final String imageUrl = placeData['imageUrl'] ?? '';
    final double rating = (placeData['rating'] ?? 0).toDouble();

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 4,
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (imageUrl.isNotEmpty)
            Image.network(
              imageUrl,
              height: 180,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) =>
                  const SizedBox(height: 180, child: Center(child: Icon(Icons.image_not_supported, color: Colors.grey))),
            ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
                if (rating > 0) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.star, color: Colors.amber, size: 20),
                      const SizedBox(width: 4),
                      Text(rating.toString(), style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                Text(reason, style: GoogleFonts.poppins(fontSize: 15, color: Colors.grey.shade700, fontStyle: FontStyle.italic)),
                const Divider(height: 24),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.location_on_outlined, color: Colors.grey.shade600, size: 20),
                    const SizedBox(width: 8),
                    Expanded(child: Text(address, style: GoogleFonts.poppins(color: Colors.grey.shade800))),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}