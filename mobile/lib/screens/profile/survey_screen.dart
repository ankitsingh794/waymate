// lib/screens/profile/survey_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SurveyScreen extends StatefulWidget {
  const SurveyScreen({super.key});

  @override
  State<SurveyScreen> createState() => _SurveyScreenState();
}

class _SurveyScreenState extends State<SurveyScreen> {
  String? _householdIncome;
  String? _vehicleOwnership;

  @override
  Widget build(BuildContext context) {
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
        title: Text('Research Survey', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Text(
            'Your anonymous responses to these optional questions help transportation researchers create better public services. Thank you for your contribution.',
            style: GoogleFonts.poppins(fontSize: 15, color: Colors.grey.shade700),
          ),
          const Divider(height: 32),

          // --- Question 1 ---
          Text('What is your approximate annual household income?', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
          DropdownButtonFormField<String>(
            value: _householdIncome,
            hint: const Text('Select a range'),
            items: ['< \$50k', '\$50k - \$100k', '\$100k - \$200k', '> \$200k', 'Prefer not to say']
                .map((label) => DropdownMenuItem(value: label, child: Text(label)))
                .toList(),
            onChanged: (value) => setState(() => _householdIncome = value),
          ),
          const SizedBox(height: 24),

          // --- Question 2 ---
          Text('How many vehicles does your household own?', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
          DropdownButtonFormField<String>(
            value: _vehicleOwnership,
            hint: const Text('Select an option'),
            items: ['0', '1', '2', '3+']
                .map((label) => DropdownMenuItem(value: label, child: Text(label)))
                .toList(),
            onChanged: (value) => setState(() => _vehicleOwnership = value),
          ),
          const SizedBox(height: 40),

          ElevatedButton(
            onPressed: () {
              // TODO: Send survey data to the backend
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Thank you for your submission!')),
              );
            },
            child: const Text('Submit Survey'),
          ),
        ],
      ),
    );
  }
}