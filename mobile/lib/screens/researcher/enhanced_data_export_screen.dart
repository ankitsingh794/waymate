import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/services/export_service.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:intl/intl.dart';

class EnhancedDataExportScreen extends StatefulWidget {
  const EnhancedDataExportScreen({super.key});

  @override
  State<EnhancedDataExportScreen> createState() =>
      _EnhancedDataExportScreenState();
}

class _EnhancedDataExportScreenState extends State<EnhancedDataExportScreen>
    with SingleTickerProviderStateMixin {
  final ExportService _exportService = ExportService();
  late TabController _tabController;

  String? _loadingFormat;
  String? _errorMessage;
  double _downloadProgress = 0.0;
  ExportStats? _exportStats;

  // Filters
  DateTime? _startDate;
  DateTime? _endDate;
  bool _includePassiveData = true;
  String? _selectedRegion;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this); // Changed to 3 tabs
    _loadExportStats();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadExportStats() async {
    try {
      final stats = await _exportService.getExportStats();
      setState(() {
        _exportStats = stats;
      });
    } catch (e) {
      debugPrint('Failed to load export stats: $e');
    }
  }

  Future<void> _handleExport(String format) async {
    setState(() {
      _loadingFormat = format;
      _errorMessage = null;
      _downloadProgress = 0.0;
    });

    try {
      final filters = _buildFilters();

      await _exportService.downloadExportWithProgress(
        format,
        (progress) {
          setState(() {
            _downloadProgress = progress;
          });
        },
        filters: filters,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Export completed successfully!'),
            backgroundColor: Colors.green,
            action: SnackBarAction(
              label: 'Refresh Stats',
              onPressed: _loadExportStats,
            ),
          ),
        );
      }
    } catch (e) {
      String errorMessage = 'Export failed: ${e.toString()}';

      // Handle permission-specific errors
      if (errorMessage.contains('permission')) {
        if (errorMessage.contains('permanently denied')) {
          if (mounted) {
            _showPermissionSettingsDialog();
          }
        } else {
          if (mounted) {
            _showPermissionDialog();
          }
        }
      }

      setState(() {
        _errorMessage = errorMessage;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loadingFormat = null;
          _downloadProgress = 0.0;
        });
      }
    }
  }

  void _showPermissionDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Storage Permission Required'),
        content: const Text(
          'WayMate needs storage permission to save and share export files. '
          'Please grant storage permission when prompted.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _retryCurrentExport();
            },
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  void _showPermissionSettingsDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Storage Permission Denied'),
        content: const Text(
          'Storage permission has been permanently denied. '
          'Please enable it in app settings to download exports.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              openAppSettings();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  void _retryCurrentExport() {
    if (_loadingFormat != null) {
      _handleExport(_loadingFormat!);
    }
  }

  Map<String, String> _buildFilters() {
    final filters = <String, String>{};

    if (_startDate != null) {
      filters['startDate'] = _startDate!.toIso8601String();
    }
    if (_endDate != null) {
      filters['endDate'] = _endDate!.toIso8601String();
    }
    if (_includePassiveData) {
      filters['includePassive'] = 'true';
    }
    if (_selectedRegion != null) {
      filters['region'] = _selectedRegion!;
    }

    return filters;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Data Export Center', style: GoogleFonts.poppins()),
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
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(icon: Icon(Icons.download), text: 'Quick Export'),
            Tab(icon: Icon(Icons.science), text: 'Research Export'),
            Tab(icon: Icon(Icons.analytics), text: 'Statistics'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildQuickExportTab(), // Basic functionality
          _buildResearchExportTab(), // Enhanced NATPAC functionality
          _buildStatsTab(), // Statistics
        ],
      ),
    );
  }

  // NEW: Quick Export Tab (Basic functionality from data_export_screen.dart)
  Widget _buildQuickExportTab() {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        // Quick Export Info Card
        Card(
          color: Colors.green[50],
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.flash_on, color: Colors.green[700]),
                    const SizedBox(width: 8),
                    Text(
                      'Quick Export',
                      style: GoogleFonts.poppins(
                        fontWeight: FontWeight.bold,
                        color: Colors.green[800],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Fast and simple data exports for basic analysis. Files are generated instantly and ready to share.',
                  style: GoogleFonts.poppins(
                      fontSize: 13, color: Colors.green[700]),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 16),

        Text(
          'Select Export Format',
          style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),

        // Basic Export Options
        _buildExportOption(
          title: 'Summary Export (CSV)',
          subtitle:
              'High-level summary of all trip data - perfect for quick analysis',
          format: 'csv',
          icon: Icons.table_chart_outlined,
          category: 'basic',
        ),
        _buildExportOption(
          title: 'Standard NATPAC Export (CSV)',
          subtitle: 'Basic NATPAC-compliant data for transportation research',
          format: 'natpac-csv',
          icon: Icons.science_outlined,
          category: 'basic',
        ),
        _buildExportOption(
          title: 'Complete Data Export (JSON)',
          subtitle: 'Full trip data in JSON format for custom processing',
          format: 'json',
          icon: Icons.code_outlined,
          category: 'basic',
        ),

        // Progress and Error Display
        if (_loadingFormat != null) ...[
          const SizedBox(height: 16),
          _buildProgressIndicator(),
        ],

        if (_errorMessage != null) ...[
          const SizedBox(height: 16),
          _buildErrorMessage(),
        ],
      ],
    );
  }

  // UPDATED: Research Export Tab (Enhanced NATPAC functionality)
  Widget _buildResearchExportTab() {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        // NATPAC Info Card
        _buildNatpacInfoCard(),

        const SizedBox(height: 16),

        // Filters Section
        _buildFiltersSection(),

        const SizedBox(height: 24),

        Text(
          'Advanced Research Exports',
          style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),

        // Enhanced NATPAC Exports
        _buildSectionHeader('Enhanced NATPAC Research Exports'),
        _buildExportOption(
          title: 'Comprehensive NATPAC Export',
          subtitle:
              'Complete dataset with passive tracking, mode detection, and companion analysis',
          format: 'comprehensive-csv',
          icon: Icons.science,
          isRecommended: true,
          category: 'research',
        ),
        _buildExportOption(
          title: 'Trip Chains Analysis',
          subtitle:
              'Daily trip chains and travel patterns for transportation planning',
          format: 'trip-chains-csv',
          icon: Icons.route,
          category: 'research',
        ),
        _buildExportOption(
          title: 'Mode Share Statistics',
          subtitle: 'Aggregated mode share data and transportation insights',
          format: 'mode-share-csv',
          icon: Icons.pie_chart,
          category: 'research',
        ),

        // Progress and Error Display
        if (_loadingFormat != null) ...[
          const SizedBox(height: 16),
          _buildProgressIndicator(),
        ],

        if (_errorMessage != null) ...[
          const SizedBox(height: 16),
          _buildErrorMessage(),
        ],
      ],
    );
  }

  Widget _buildNatpacInfoCard() {
    return Card(
      color: Colors.blue[50],
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.info_outline, color: Colors.blue[700]),
                const SizedBox(width: 8),
                Text(
                  'NATPAC Research Export',
                  style: GoogleFonts.poppins(
                    fontWeight: FontWeight.bold,
                    color: Colors.blue[800],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Export anonymized transportation data for NATPAC research. This includes passive tracking data, mode detection, companion analysis, and trip chain patterns essential for transportation planning.',
              style: GoogleFonts.poppins(fontSize: 13, color: Colors.blue[700]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFiltersSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Export Filters',
              style: GoogleFonts.poppins(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),

            // Date Range
            Row(
              children: [
                Expanded(
                  child: _buildDateField(
                    label: 'Start Date',
                    date: _startDate,
                    onTap: () => _selectDate(true),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildDateField(
                    label: 'End Date',
                    date: _endDate,
                    onTap: () => _selectDate(false),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Include Passive Data Toggle
            SwitchListTile(
              title: Text('Include Passive Tracking Data',
                  style: GoogleFonts.poppins()),
              subtitle: Text('ML-detected trips and sensor data',
                  style: GoogleFonts.poppins(fontSize: 12)),
              value: _includePassiveData,
              onChanged: (value) {
                setState(() {
                  _includePassiveData = value;
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDateField({
    required String label,
    required DateTime? date,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
          suffixIcon: const Icon(Icons.calendar_today),
        ),
        child: Text(
          date != null ? DateFormat('yyyy-MM-dd').format(date) : 'Select date',
          style: GoogleFonts.poppins(),
        ),
      ),
    );
  }

  Future<void> _selectDate(bool isStartDate) async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );

    if (date != null) {
      setState(() {
        if (isStartDate) {
          _startDate = date;
        } else {
          _endDate = date;
        }
      });
    }
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Text(
        title,
        style: GoogleFonts.poppins(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: Colors.grey[700],
        ),
      ),
    );
  }

  Widget _buildExportOption({
    required String title,
    required String subtitle,
    required String format,
    required IconData icon,
    bool isRecommended = false,
    String category = 'basic',
  }) {
    final bool isLoading = _loadingFormat == format;

    return Card(
      margin: const EdgeInsets.only(bottom: 12.0),
      child: Stack(
        children: [
          ListTile(
            leading: Icon(icon, color: Theme.of(context).primaryColor),
            title: Row(
              children: [
                Expanded(
                  child: Text(title,
                      style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                ),
                if (isRecommended)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.green,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'RECOMMENDED',
                      style: GoogleFonts.poppins(
                        fontSize: 10,
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                if (category == 'research')
                  Container(
                    margin: const EdgeInsets.only(left: 8),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.blue,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'RESEARCH',
                      style: GoogleFonts.poppins(
                        fontSize: 10,
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            subtitle: Text(subtitle, style: GoogleFonts.poppins(fontSize: 13)),
            trailing: isLoading
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 3))
                : const Icon(Icons.download_for_offline_outlined),
            onTap: isLoading ? null : () => _handleExport(format),
          ),
          if (isRecommended)
            Positioned(
              top: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: const BoxDecoration(
                  color: Colors.green,
                  borderRadius: BorderRadius.only(
                    topRight: Radius.circular(8),
                    bottomLeft: Radius.circular(8),
                  ),
                ),
                child: const Icon(Icons.star, size: 16, color: Colors.white),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Text(
              'Exporting ${_loadingFormat?.toUpperCase()}...',
              style: GoogleFonts.poppins(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(value: _downloadProgress),
            const SizedBox(height: 8),
            Text(
              '${(_downloadProgress * 100).toStringAsFixed(0)}% complete',
              style: GoogleFonts.poppins(fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorMessage() {
    return Card(
      color: Colors.red[50],
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Icon(Icons.error_outline, color: Colors.red[700]),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                _errorMessage!,
                style: GoogleFonts.poppins(color: Colors.red[700]),
              ),
            ),
            if (_errorMessage!.contains('permission'))
              TextButton(
                onPressed: _retryCurrentExport,
                child: Text('Retry', style: GoogleFonts.poppins()),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsTab() {
    if (_exportStats == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        _buildStatsCard(
            'Total Trips', _exportStats!.totalTrips.toString(), Icons.route),
        _buildStatsCard(
            'Total Users', _exportStats!.totalUsers.toString(), Icons.people),
        _buildStatsCard('Total Households',
            _exportStats!.totalHouseholds.toString(), Icons.home),
        if (_exportStats!.lastExport != null)
          _buildStatsCard(
            'Last Export',
            DateFormat('yyyy-MM-dd HH:mm').format(_exportStats!.lastExport!),
            Icons.access_time,
          ),
      ],
    );
  }

  Widget _buildStatsCard(String title, String value, IconData icon) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12.0),
      child: ListTile(
        leading: Icon(icon, color: Theme.of(context).primaryColor),
        title: Text(title, style: GoogleFonts.poppins()),
        trailing: Text(
          value,
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ),
    );
  }
}
