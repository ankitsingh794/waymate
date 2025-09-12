// lib/widgets/survey_card.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SurveyCard extends StatelessWidget {
  final VoidCallback onDismiss;
  final VoidCallback onTakeSurvey;

  const SurveyCard({
    super.key, 
    required this.onDismiss,
    required this.onTakeSurvey, // Make it required
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      color: Colors.blue.shade50,
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.ballot_outlined, color: Colors.blue.shade800),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Help Improve Public Transport',
                    style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: Colors.blue.shade900),
                  ),
                ),
                IconButton(icon: const Icon(Icons.close, size: 20), onPressed: onDismiss),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Your anonymous feedback on a short survey can make a big difference.',
              style: GoogleFonts.poppins(color: Colors.black87),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                // --- UPDATED: Use the new callback ---
                onPressed: onTakeSurvey,
                child: const Text('Take Survey'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}