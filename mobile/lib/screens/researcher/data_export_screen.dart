// lib/screens/researcher/data_export_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/services/export_service.dart';

class DataExportScreen extends StatefulWidget {
  const DataExportScreen({super.key});

  @override
  State<DataExportScreen> createState() => _DataExportScreenState();
}

class _DataExportScreenState extends State<DataExportScreen> {
  final ExportService _exportService = ExportService();
  String? _loadingFormat; // To track which button is currently loading
  String? _errorMessage;

  Future<void> _handleExport(String format) async {
    setState(() {
      _loadingFormat = format;
      _errorMessage = null;
    });
    try {
      await _exportService.downloadExport(format);
    } catch (e) {
      setState(() {
        _errorMessage = 'Error: ${e.toString()}';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loadingFormat = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Data Export', style: GoogleFonts.poppins()),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Text(
            'Select an export format. The file will be generated and opened automatically.',
            style: GoogleFonts.poppins(fontSize: 15, color: Colors.grey.shade700),
          ),
          const Divider(height: 32),
          _buildExportOption(
            title: 'Summary Export (CSV)',
            subtitle: 'A high-level summary of all trip data.',
            format: 'csv',
            icon: Icons.table_chart_outlined,
          ),
          _buildExportOption(
            title: 'NATPAC Export (CSV)',
            subtitle: 'Detailed, anonymized trip-chain data for research.',
            format: 'natpac-csv',
            icon: Icons.science_outlined,
          ),
          _buildExportOption(
            title: 'Full Export (JSON)',
            subtitle: 'Complete, raw trip data in JSON format.',
            format: 'json',
            icon: Icons.code_outlined,
          ),
          if (_errorMessage != null)
            Padding(
              padding: const EdgeInsets.only(top: 20.0),
              child: Text(
                _errorMessage!,
                style: GoogleFonts.poppins(color: Colors.red.shade700),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildExportOption({
    required String title,
    required String subtitle,
    required String format,
    required IconData icon,
  }) {
    final bool isLoading = _loadingFormat == format;
    return Card(
      margin: const EdgeInsets.only(bottom: 16.0),
      child: ListTile(
        leading: Icon(icon, color: Theme.of(context).primaryColor),
        title: Text(title, style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle, style: GoogleFonts.poppins()),
        trailing: isLoading
            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 3))
            : const Icon(Icons.download_for_offline_outlined),
        onTap: isLoading ? null : () => _handleExport(format),
      ),
    );
  }
}