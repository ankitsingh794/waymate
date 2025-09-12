import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/user_model.dart';
import 'package:mobile/services/analytics_service.dart';
import 'package:mobile/services/api_client.dart';
import 'package:mobile/services/user_service.dart';

class AnalyticsDashboardScreen extends StatefulWidget {
  const AnalyticsDashboardScreen({super.key});

  @override
  State<AnalyticsDashboardScreen> createState() =>
      _AnalyticsDashboardScreenState();
}

class _AnalyticsDashboardScreenState extends State<AnalyticsDashboardScreen> {
  final AnalyticsService _analyticsService = AnalyticsService();
  final UserService _userService = UserService();

  late Future<Map<String, dynamic>> _analyticsDataFuture;
  late Future<List<User>> _usersFuture;

  // Co-Traveler Analysis State
  String? _selectedMemberAHash;
  String? _selectedMemberBHash;
  Map<String, dynamic>? _coTravelerResult;
  bool _isAnalyzing = false;
  String? _analysisError;

  @override
  void initState() {
    super.initState();
    _analyticsDataFuture = _loadAnalyticsData();
    _usersFuture = _userService.getAllUsers();
  }

  Future<Map<String, dynamic>> _loadAnalyticsData() async {
    try {
      final results = await Future.wait([
        _analyticsService.getTripStats(),
        _analyticsService.getModeDistribution(),
        _analyticsService.getPurposeDistribution(),
      ]);
      return {
        'stats': results[0],
        'modeDistribution': results[1],
        'purposeDistribution': results[2],
      };
    } catch (e) {
      debugPrint('Error loading analytics data: $e');
      rethrow;
    }
  }

  Future<void> _analyzeCoTravelers() async {
    if (_selectedMemberAHash == null || _selectedMemberBHash == null) {
      setState(() => _analysisError = 'Please select two different members.');
      return;
    }

    if (_selectedMemberAHash == _selectedMemberBHash) {
      setState(() => _analysisError = 'Please select two different members.');
      return;
    }

    setState(() {
      _isAnalyzing = true;
      _analysisError = null;
      _coTravelerResult = null;
    });

    try {
      final result = await _analyticsService.getCoTravelerFrequency(
        memberAHash: _selectedMemberAHash!,
        memberBHash: _selectedMemberBHash!,
      );
      setState(() => _coTravelerResult = result);
    } on ApiException catch (e) {
      setState(() => _analysisError = e.message);
    } catch (e) {
      setState(() =>
          _analysisError = 'An unexpected error occurred: ${e.toString()}');
    } finally {
      if (mounted) setState(() => _isAnalyzing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Analytics Dashboard', style: GoogleFonts.poppins()),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color.fromARGB(255, 87, 184, 203),
                Color.fromARGB(255, 14, 59, 76)
              ],
            ),
          ),
        ),
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _analyticsDataFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                  const SizedBox(height: 16),
                  Text('Error loading data',
                      style: GoogleFonts.poppins(fontSize: 18)),
                  const SizedBox(height: 8),
                  Text('${snapshot.error}',
                      style: GoogleFonts.poppins(
                          fontSize: 14, color: Colors.grey[600])),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      setState(() {
                        _analyticsDataFuture = _loadAnalyticsData();
                        _usersFuture = _userService.getAllUsers();
                      });
                    },
                    child: Text('Retry', style: GoogleFonts.poppins()),
                  ),
                ],
              ),
            );
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
                _usersFuture = _userService.getAllUsers();
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
                const SizedBox(height: 24),
                _buildCoTravelerAnalysisCard(),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatsGrid(Map<String, dynamic> stats) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard('Total Trips', stats['totalTrips']?.toString() ?? '0'),
        _buildStatCard('Avg. Duration',
            '${stats['averageDurationInDays']?.toStringAsFixed(1) ?? '0'} days'),
        _buildStatCard(
            'Total Travelers', stats['totalTravelers']?.toString() ?? '0'),
        _buildStatCard('Avg. Group Size',
            stats['averageGroupSize']?.toStringAsFixed(1) ?? '0'),
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
            Text(title,
                style: GoogleFonts.poppins(
                    fontSize: 14, color: Colors.grey.shade600)),
            const SizedBox(height: 8),
            Text(value,
                style: GoogleFonts.poppins(
                    fontSize: 24, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildPieChartCard(String title, List data) {
    if (data.isEmpty) {
      return Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: GoogleFonts.poppins(
                      fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 20),
              const Center(child: Text('No data available')),
            ],
          ),
        ),
      );
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: GoogleFonts.poppins(
                    fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: PieChart(
                PieChartData(
                  sections: List.generate(data.length.clamp(0, 8), (i) {
                    // Limit to 8 sections
                    final item = data[i];
                    final count = (item['count'] as int? ?? 0);
                    final label = item['_id']?.toString() ?? 'Unknown';

                    return PieChartSectionData(
                      color: Colors.primaries[i % Colors.primaries.length],
                      value: count.toDouble(),
                      title: '$label\n($count)',
                      radius: 80,
                      titleStyle: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
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
    if (data.isEmpty) {
      return Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: GoogleFonts.poppins(
                      fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 20),
              const Center(child: Text('No data available')),
            ],
          ),
        ),
      );
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: GoogleFonts.poppins(
                    fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            SizedBox(
              height: 250,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  barGroups: List.generate(data.length.clamp(0, 10), (i) {
                    // Limit to 10 bars
                    final item = data[i];
                    return BarChartGroupData(
                      x: i,
                      barRods: [
                        BarChartRodData(
                          toY: (item['count'] as int? ?? 0).toDouble(),
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
                        getTitlesWidget: (value, meta) {
                          if (value.toInt() >= 0 &&
                              value.toInt() < data.length) {
                            final item = data[value.toInt()];
                            final label = item['_id']?.toString() ?? 'Unknown';
                            return Padding(
                              padding: const EdgeInsets.only(top: 8.0),
                              child: Text(
                                label.length > 8
                                    ? '${label.substring(0, 8)}...'
                                    : label,
                                style: GoogleFonts.poppins(fontSize: 10),
                                textAlign: TextAlign.center,
                              ),
                            );
                          }
                          return const Text('');
                        },
                        reservedSize: 40,
                      ),
                    ),
                    leftTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                    topTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
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

  Widget _buildCoTravelerAnalysisCard() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Co-Traveler Analysis',
                style: GoogleFonts.poppins(
                    fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Analyze how often two members travel together',
                style:
                    GoogleFonts.poppins(fontSize: 12, color: Colors.grey[600])),
            const SizedBox(height: 16),
            FutureBuilder<List<User>>(
              future: _usersFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: Text('Loading users...'));
                }
                if (snapshot.hasError) {
                  return Center(
                    child: Column(
                      children: [
                        Text('Error loading users: ${snapshot.error}'),
                        ElevatedButton(
                          onPressed: () => setState(
                              () => _usersFuture = _userService.getAllUsers()),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                final users = snapshot.data ?? [];
                if (users.isEmpty) {
                  return const Center(
                      child: Text('No users available for analysis.'));
                }

                return Column(
                  children: [
                    DropdownButtonFormField<String>(
                      value: _selectedMemberAHash,
                      hint: const Text('Select Member A'),
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        labelText: 'Member A',
                      ),
                      items: users
                          .map((user) => DropdownMenuItem(
                                value: user
                                    .anonymizedHash, // Use anonymized hash instead of real ID
                                child: Text(user.name),
                              ))
                          .toList(),
                      onChanged: (value) =>
                          setState(() => _selectedMemberAHash = value),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: _selectedMemberBHash,
                      hint: const Text('Select Member B'),
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        labelText: 'Member B',
                      ),
                      items: users
                          .map((user) => DropdownMenuItem(
                                value: user
                                    .anonymizedHash, // Use anonymized hash instead of real ID
                                child: Text(user.name),
                              ))
                          .toList(),
                      onChanged: (value) =>
                          setState(() => _selectedMemberBHash = value),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isAnalyzing ? null : _analyzeCoTravelers,
                child: _isAnalyzing
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Analyze Co-Travel Frequency'),
              ),
            ),
            if (_analysisError != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red[200]!),
                ),
                child: Row(
                  children: [
                    Icon(Icons.error_outline, color: Colors.red[700]),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(_analysisError!,
                          style: GoogleFonts.poppins(color: Colors.red[700])),
                    ),
                  ],
                ),
              ),
            ],
            if (_coTravelerResult != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green[200]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.analytics, color: Colors.green[700]),
                        const SizedBox(width: 8),
                        Text('Analysis Results',
                            style: GoogleFonts.poppins(
                                fontWeight: FontWeight.bold,
                                color: Colors.green[800])),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildResultRow(
                        'Common Trips', '${_coTravelerResult!['commonTrips']}'),
                    _buildResultRow('Avg. Trip Duration',
                        '${_coTravelerResult!['avgTripDuration']} days'),
                    if (_coTravelerResult!['commonPurposes']?.isNotEmpty ==
                        true)
                      _buildResultRow(
                          'Common Purposes',
                          (_coTravelerResult!['commonPurposes'] as List)
                              .join(', ')),
                    if (_coTravelerResult!['commonTransportModes']
                            ?.isNotEmpty ==
                        true)
                      _buildResultRow(
                          'Transport Modes',
                          (_coTravelerResult!['commonTransportModes'] as List)
                              .join(', ')),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildResultRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text('$label:',
                style: GoogleFonts.poppins(fontWeight: FontWeight.w500)),
          ),
          Expanded(
            child: Text(value, style: GoogleFonts.poppins()),
          ),
        ],
      ),
    );
  }
}
