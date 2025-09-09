// lib/screens/researcher/researcher_tools_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/screens/researcher/analytics_dashboard_screen.dart';
import 'package:mobile/screens/researcher/data_export_screen.dart';

class ResearcherToolsScreen extends StatelessWidget {
  const ResearcherToolsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Researcher Tools', style: GoogleFonts.poppins()),
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
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8.0),
        children: [
          ListTile(
            leading: const Icon(Icons.analytics_outlined),
            title: Text('Analytics Dashboard', style: GoogleFonts.poppins()),
            subtitle: Text('Visualize trip data and trends.', style: GoogleFonts.poppins()),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const AnalyticsDashboardScreen()),
              );
            },

          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.download_outlined),
            title: Text('Data Export', style: GoogleFonts.poppins()),
            subtitle: Text('Download anonymized trip data.', style: GoogleFonts.poppins()),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const DataExportScreen()),
              );
            },
          ),
        ],
      ),
    );
  }
}