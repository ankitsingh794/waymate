import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/trip_models.dart';
import 'package:mobile/widgets/smart_schedule_option_card.dart';

class SmartScheduleScreen extends StatelessWidget {
  final SmartSchedule schedule;
  const SmartScheduleScreen({super.key, required this.schedule});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Smart Train Schedule', style: GoogleFonts.poppins()),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // --- NEW: A more detailed header card ---
          _buildHeaderCard(context),
          const SizedBox(height: 24),
          
          // --- NEW: Handles the case where no options are found ---
          if (schedule.options.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(32.0),
                child: Text(
                  'No train options could be found for the selected date.',
                  textAlign: TextAlign.center,
                ),
              ),
            ),
            
          // --- This logic remains the same ---
          ...schedule.options.map((option) {
            final bool isRecommended = option == schedule.options.first;
            return SmartScheduleOptionCard(optionData: option, isRecommended: isRecommended);
          }),
        ],
      ),
    );
  }

  // --- NEW: Helper widget for the header ---
  Widget _buildHeaderCard(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStationColumn("From", schedule.sourceStation ?? 'N/A'),
                Icon(Icons.arrow_forward, color: Theme.of(context).primaryColor),
                _buildStationColumn("To", schedule.destinationStation ?? 'N/A'),
              ],
            ),
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.calendar_today, size: 16),
                    const SizedBox(width: 8),
                    Text(
                      schedule.travelDate != null
                          ? DateFormat('EEE, MMM d, yyyy').format(DateTime.parse(schedule.travelDate!))
                          : 'No Date',
                      style: GoogleFonts.poppins(),
                    ),
                  ],
                ),
                if (schedule.lastUpdated != null)
                  Text(
                    'Updated: ${DateFormat.jm().format(schedule.lastUpdated!)}',
                    style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStationColumn(String label, String station) {
    return Column(
      children: [
        Text(label, style: GoogleFonts.poppins(color: Colors.grey.shade600)),
        Text(station, style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
      ],
    );
  }
}