// lib/screens/researcher/analytics_dashboard_screen.dart

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/services/analytics_service.dart';

class AnalyticsDashboardScreen extends StatefulWidget {
  const AnalyticsDashboardScreen({super.key});

  @override
  State<AnalyticsDashboardScreen> createState() => _AnalyticsDashboardScreenState();
}

class _AnalyticsDashboardScreenState extends State<AnalyticsDashboardScreen> {
  late Future<Map<String, dynamic>> _analyticsDataFuture;
  final AnalyticsService _analyticsService = AnalyticsService();

  @override
  void initState() {
    super.initState();
    // Fetch all data in parallel for faster loading
    _analyticsDataFuture = _loadAnalyticsData();
  }

  Future<Map<String, dynamic>> _loadAnalyticsData() async {
    try {
      final results = await Future.wait([
        _analyticsService.getTripStats(),
        _analyticsService.getModeDistribution(),
        _analyticsService.getPurposeDistribution(),
      ]);
      return {
        'stats': results[0]['stats'],
        'modeDistribution': results[1]['distribution'],
        'purposeDistribution': results[2]['distribution'],
      };
    } catch (e) {
      // Propagate the error to be handled by the FutureBuilder
      throw Exception('Failed to load analytics data: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Analytics Dashboard', style: GoogleFonts.poppins()),
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _analyticsDataFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error loading data: ${snapshot.error}'));
          }
          if (!snapshot.hasData || snapshot.data == null) {
            return const Center(child: Text('No analytics data available.'));
          }

          final data = snapshot.data!;
          final stats = data['stats'] as Map<String, dynamic>;
          final modeDistribution = data['modeDistribution'] as List;
          final purposeDistribution = data['purposeDistribution'] as List;

          return RefreshIndicator(
            onRefresh: () {
              setState(() {
                _analyticsDataFuture = _loadAnalyticsData();
              });
              return _analyticsDataFuture;
            },
            child: ListView(
              padding: const EdgeInsets.all(16.0),
              children: [
                _buildStatsGrid(stats),
                const SizedBox(height: 24),
                _buildPieChartCard('Transport Modes', modeDistribution),
                const SizedBox(height: 24),
                _buildBarChartCard('Trip Purposes', purposeDistribution),
              ],
            ),
          );
        },
      ),
    );
  }

  // --- UI Helper Widgets ---

  Widget _buildStatsGrid(Map<String, dynamic> stats) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard('Total Trips', stats['totalTrips'].toString()),
        _buildStatCard('Avg. Duration', '${stats['averageDurationInDays']?.toStringAsFixed(1) ?? 'N/A'} days'),
        _buildStatCard('Total Travelers', stats['totalTravelers'].toString()),
        _buildStatCard('Avg. Group Size', stats['averageGroupSize']?.toStringAsFixed(1) ?? 'N/A'),
      ],
    );
  }
  
  Widget _buildStatCard(String title, String value) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(title, style: GoogleFonts.poppins(fontSize: 14, color: Colors.grey.shade600)),
            const SizedBox(height: 8),
            Text(value, style: GoogleFonts.poppins(fontSize: 24, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildPieChartCard(String title, List data) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: PieChart(
                PieChartData(
                  sections: List.generate(data.length, (i) {
                    final item = data[i];
                    return PieChartSectionData(
                      color: Colors.primaries[i % Colors.primaries.length],
                      value: (item['count'] as int).toDouble(),
                      title: '${item['_id']}\n(${item['count']})',
                      radius: 80,
                      titleStyle: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                    );
                  }),
                  borderData: FlBorderData(show: false),
                  sectionsSpace: 2,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBarChartCard(String title, List data) {
     return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            SizedBox(
              height: 250,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  barGroups: List.generate(data.length, (i) {
                    final item = data[i];
                    return BarChartGroupData(
                      x: i,
                      barRods: [
                        BarChartRodData(
                          toY: (item['count'] as int).toDouble(),
                          color: Colors.primaries[i % Colors.primaries.length],
                          width: 20,
                          borderRadius: BorderRadius.circular(4),
                        )
                      ],
                    );
                  }),
                  titlesData: FlTitlesData(
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) => Text(
                          data[value.toInt()]['_id'],
                          style: GoogleFonts.poppins(fontSize: 10),
                        ),
                        reservedSize: 30,
                      ),
                    ),
                    leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  gridData: const FlGridData(show: false),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}