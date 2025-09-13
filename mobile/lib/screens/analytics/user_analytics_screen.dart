// lib/screens/analytics/user_analytics_screen.dart

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/services/analytics_service.dart';
import 'package:mobile/services/api_client.dart';
import 'package:mobile/theme/theme.dart';

/// A user-facing analytics dashboard that shows personal trip insights
/// This screen makes full use of the server's analytics endpoints
class UserAnalyticsScreen extends StatefulWidget {
  const UserAnalyticsScreen({super.key});

  @override
  State<UserAnalyticsScreen> createState() => _UserAnalyticsScreenState();
}

class _UserAnalyticsScreenState extends State<UserAnalyticsScreen>
    with SingleTickerProviderStateMixin {
  final AnalyticsService _analyticsService = AnalyticsService();

  late TabController _tabController;
  bool _isLoading = true;
  String? _error;

  // Analytics data
  Map<String, dynamic>? _tripStats;
  List<dynamic>? _modeDistribution;
  List<dynamic>? _purposeDistribution;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAnalyticsData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAnalyticsData() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final results = await Future.wait([
        _analyticsService.getTripStats(),
        _analyticsService.getModeDistribution(),
        _analyticsService.getPurposeDistribution(),
      ]);

      setState(() {
        _tripStats = results[0] as Map<String, dynamic>;
        _modeDistribution = results[1] as List<dynamic>;
        _purposeDistribution = results[2] as List<dynamic>;
        _isLoading = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load analytics data';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(
          'Trip Insights',
          style: GoogleFonts.poppins(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        backgroundColor: primaryColor,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _loadAnalyticsData,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: accentColor,
          tabs: const [
            Tab(text: 'Overview', icon: Icon(Icons.analytics)),
            Tab(text: 'Transport', icon: Icon(Icons.directions)),
            Tab(text: 'Purpose', icon: Icon(Icons.place)),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorWidget()
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOverviewTab(),
                    _buildModeDistributionTab(),
                    _buildPurposeDistributionTab(),
                  ],
                ),
    );
  }

  Widget _buildErrorWidget() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            'Failed to load analytics',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _error ?? 'Unknown error occurred',
            style: GoogleFonts.poppins(
              fontSize: 14,
              color: Colors.grey[600],
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loadAnalyticsData,
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryColor,
              foregroundColor: Colors.white,
            ),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewTab() {
    if (_tripStats == null) return const SizedBox();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Trip Statistics',
            style: GoogleFonts.poppins(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 16),
          _buildStatsGrid(),
          const SizedBox(height: 24),
          _buildInsightCards(),
        ],
      ),
    );
  }

  Widget _buildStatsGrid() {
    final stats = _tripStats!;

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard(
          'Total Trips',
          stats['totalTrips']?.toString() ?? '0',
          Icons.trip_origin,
          primaryColor,
        ),
        _buildStatCard(
          'Active Trips',
          stats['activeTrips']?.toString() ?? '0',
          Icons.play_circle,
          Colors.green,
        ),
        _buildStatCard(
          'Completed',
          stats['completedTrips']?.toString() ?? '0',
          Icons.check_circle,
          Colors.blue,
        ),
        _buildStatCard(
          'Total Distance',
          '${stats['totalDistance'] ?? 0} km',
          Icons.straighten,
          Colors.orange,
        ),
      ],
    );
  }

  Widget _buildStatCard(
      String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 32),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.poppins(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          Text(
            title,
            style: GoogleFonts.poppins(
              fontSize: 12,
              color: Colors.grey[600],
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildInsightCards() {
    return Column(
      children: [
        _buildInsightCard(
          'Most Popular Mode',
          _getMostPopularMode(),
          Icons.directions_car,
          'Based on your trip data',
        ),
        const SizedBox(height: 12),
        _buildInsightCard(
          'Primary Purpose',
          _getMostPopularPurpose(),
          Icons.work,
          'Your main travel reason',
        ),
      ],
    );
  }

  Widget _buildInsightCard(
      String title, String value, IconData icon, String subtitle) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: primaryColor),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                ),
                Text(
                  value,
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[800],
                  ),
                ),
                Text(
                  subtitle,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModeDistributionTab() {
    if (_modeDistribution == null || _modeDistribution!.isEmpty) {
      return const Center(child: Text('No transportation mode data available'));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Transportation Modes',
            style: GoogleFonts.poppins(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            height: 300,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: PieChart(
              PieChartData(
                sections: _buildModeChartSections(),
                centerSpaceRadius: 60,
                sectionsSpace: 2,
              ),
            ),
          ),
          const SizedBox(height: 16),
          _buildModeListView(),
        ],
      ),
    );
  }

  Widget _buildPurposeDistributionTab() {
    if (_purposeDistribution == null || _purposeDistribution!.isEmpty) {
      return const Center(child: Text('No trip purpose data available'));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Trip Purposes',
            style: GoogleFonts.poppins(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            height: 300,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: BarChart(
              BarChartData(
                barGroups: _buildPurposeBarGroups(),
                titlesData: FlTitlesData(
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: _getPurposeTitleWidget,
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 40,
                    ),
                  ),
                  topTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  rightTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                ),
                borderData: FlBorderData(show: false),
                gridData: const FlGridData(show: false),
              ),
            ),
          ),
          const SizedBox(height: 16),
          _buildPurposeListView(),
        ],
      ),
    );
  }

  List<PieChartSectionData> _buildModeChartSections() {
    final colors = [
      primaryColor,
      Colors.blue,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.red,
    ];

    return _modeDistribution!.asMap().entries.map((entry) {
      final index = entry.key;
      final data = entry.value;
      final color = colors[index % colors.length];

      return PieChartSectionData(
        value: data['count']?.toDouble() ?? 0,
        title: '${data['percentage']?.round() ?? 0}%',
        color: color,
        radius: 80,
        titleStyle: GoogleFonts.poppins(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      );
    }).toList();
  }

  Widget _buildModeListView() {
    return Column(
      children: _modeDistribution!.map((data) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  color: _getModeColor(data['_id']),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  _formatModeName(data['_id']),
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              Text(
                '${data['count']} trips (${data['percentage']?.round() ?? 0}%)',
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  List<BarChartGroupData> _buildPurposeBarGroups() {
    return _purposeDistribution!.asMap().entries.map((entry) {
      final index = entry.key;
      final data = entry.value;

      return BarChartGroupData(
        x: index,
        barRods: [
          BarChartRodData(
            toY: data['count']?.toDouble() ?? 0,
            color: primaryColor,
            width: 20,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
          ),
        ],
      );
    }).toList();
  }

  Widget _getPurposeTitleWidget(double value, TitleMeta meta) {
    final index = value.toInt();
    if (index >= 0 && index < _purposeDistribution!.length) {
      final purpose = _purposeDistribution![index]['_id'];
      return Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Text(
          _formatPurposeName(purpose),
          style: GoogleFonts.poppins(fontSize: 10),
        ),
      );
    }
    return const Text('');
  }

  Widget _buildPurposeListView() {
    return Column(
      children: _purposeDistribution!.map((data) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  color: primaryColor,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  _formatPurposeName(data['_id']),
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              Text(
                '${data['count']} trips (${data['percentage']?.round() ?? 0}%)',
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  String _getMostPopularMode() {
    if (_modeDistribution == null || _modeDistribution!.isEmpty) return 'N/A';
    final most = _modeDistribution!.first;
    return _formatModeName(most['_id']);
  }

  String _getMostPopularPurpose() {
    if (_purposeDistribution == null || _purposeDistribution!.isEmpty)
      return 'N/A';
    final most = _purposeDistribution!.first;
    return _formatPurposeName(most['_id']);
  }

  Color _getModeColor(String mode) {
    switch (mode?.toLowerCase()) {
      case 'car':
      case 'driving':
        return Colors.blue;
      case 'walking':
        return Colors.green;
      case 'cycling':
        return Colors.orange;
      case 'public_transport':
      case 'bus':
      case 'train':
        return Colors.purple;
      case 'flight':
        return Colors.red;
      default:
        return primaryColor;
    }
  }

  String _formatModeName(String mode) {
    switch (mode?.toLowerCase()) {
      case 'car':
      case 'driving':
        return 'Car/Driving';
      case 'walking':
        return 'Walking';
      case 'cycling':
        return 'Cycling';
      case 'public_transport':
        return 'Public Transport';
      case 'flight':
        return 'Flight';
      case 'bus':
        return 'Bus';
      case 'train':
        return 'Train';
      default:
        return mode ?? 'Unknown';
    }
  }

  String _formatPurposeName(String purpose) {
    switch (purpose?.toLowerCase()) {
      case 'work':
        return 'Work';
      case 'education':
        return 'Education';
      case 'shopping':
        return 'Shopping';
      case 'leisure':
        return 'Leisure';
      case 'personal_business':
        return 'Personal Business';
      case 'other':
        return 'Other';
      default:
        return purpose ?? 'Unknown';
    }
  }
}
