// lib/screens/profile/privacy_consent_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class PrivacyConsentScreen extends StatefulWidget {
  const PrivacyConsentScreen({super.key});

  @override
  State<PrivacyConsentScreen> createState() => _PrivacyConsentScreenState();
}

class _PrivacyConsentScreenState extends State<PrivacyConsentScreen> {
  // In a real app, these values would be fetched from the user's profile
  bool _passiveTrackingConsent = false;
  bool _demographicDataConsent = true;

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
        title: Text('Privacy & Consent', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text(
              'To support transportation research and improve your app experience, Waymate collects certain types of data. You have full control over what you share.',
              style: GoogleFonts.poppins(fontSize: 15, color: Colors.grey.shade700),
            ),
          ),
          const Divider(),
          SwitchListTile.adaptive(
            title: Text('Passive Location Tracking', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
            subtitle: Text(
              'Allow the app to automatically detect trips in the background to help researchers understand travel patterns. All data is anonymized.',
              style: GoogleFonts.poppins(),
            ),
            value: _passiveTrackingConsent,
            onChanged: (bool value) {
              setState(() {
                _passiveTrackingConsent = value;
                // TODO: Call API to update consent for 'passive_tracking'
              });
            },
          ),
          SwitchListTile.adaptive(
            title: Text('Share Demographic Data', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
            subtitle: Text(
              'Allow the app to include non-identifying demographic data (like age group or gender) in research exports.',
              style: GoogleFonts.poppins(),
            ),
            value: _demographicDataConsent,
            onChanged: (bool value) {
              setState(() {
                _demographicDataConsent = value;
                // TODO: Call API to update consent for 'demographic_data'
              });
            },
          ),
        ],
      ),
    );
  }
}