// lib/screens/trip_details/smart_schedule_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/widgets/smart_schedule_option_card.dart';

class SmartScheduleScreen extends StatelessWidget {
  const SmartScheduleScreen({super.key});

  // In a real app, this data would be passed from the TripDetailsScreen
  final Map<String, dynamic> _smartScheduleData = const {
    "sourceStation": "Tatanagar (TATA)",
    "destinationStation": "Chandigarh (CDG)",
    "travelDate": "2025-10-05",
    "options": [
      {
        "trainName": "Vande Bharat Express",
        "departureTime": "06:15", "arrivalTime": "18:30", "duration": "12h 15m",
        "recommendationReason": "Fastest and most comfortable option."
      },
      {
        "trainName": "Duronto Express",
        "departureTime": "22:00", "arrivalTime": "11:50", "duration": "13h 50m",
        "recommendationReason": "Good balance of speed and overnight travel."
      },
      {
        "trainName": "Jan Shatabdi",
        "departureTime": "14:25", "arrivalTime": "04:50", "duration": "14h 25m",
        "recommendationReason": "Most budget-friendly choice."
      }
    ]
  };

  @override
  Widget build(BuildContext context) {
    final String source = _smartScheduleData['sourceStation'];
    final String destination = _smartScheduleData['destinationStation'];
    final List options = _smartScheduleData['options'];

    return Scaffold(
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color.fromARGB(255, 87, 184, 203),
                Color.fromARGB(255, 14, 59, 76),
              ],
            ),
          ),
        ),
        title: Text('Smart Train Schedule', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(source, style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16.0),
                child: Icon(Icons.arrow_forward_rounded),
              ),
              Text(destination, style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 24),
          ...options.map((option) {
            // Highlight the first option as the AI's top pick
            final bool isRecommended = option == options.first;
            return SmartScheduleOptionCard(optionData: option, isRecommended: isRecommended);
          }).toList(),
        ],
      ),
    );
  }
}