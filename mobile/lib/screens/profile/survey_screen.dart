// lib/screens/profile/survey_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/socio_economic_survey_models.dart';
import 'package:mobile/services/api_client.dart';
import 'package:mobile/services/survey_service.dart';

class SurveyScreen extends StatefulWidget {
  const SurveyScreen({super.key});

  @override
  State<SurveyScreen> createState() => _SurveyScreenState();
}

class _SurveyScreenState extends State<SurveyScreen> {
  final _formKey = GlobalKey<FormState>();
  final _surveyService = SurveyService();
  late Future<SocioEconomicSurvey?> _surveyFuture;

  // Form state variables
  String? _householdIncome;
  int? _vehicleCount;
  String? _primaryTransportMode;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _surveyFuture = _surveyService.getMySurveyData();
  }

  Future<void> _submitSurvey() async {
    if (!_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill out all required fields.')),
      );
      return;
    }
    setState(() => _isLoading = true);

    try {
      final surveyData = SocioEconomicSurvey(
        householdIncome: _householdIncome,
        vehicleCount: _vehicleCount,
        primaryTransportModeToWork: _primaryTransportMode,
      );

      await _surveyService.submitOrUpdateSurveyData(surveyData);

      if (mounted) {
        Navigator.of(context).pop(true); // Pop with a 'true' result to indicate completion
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Thank you for your submission!')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.message}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

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
      body: FutureBuilder<SocioEconomicSurvey?>(
        future: _surveyFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error loading survey: ${snapshot.error}'));
          }

          // Pre-fill form if data exists from the API
          final existingData = snapshot.data;
          if (existingData != null) {
            _householdIncome ??= existingData.householdIncome;
            _vehicleCount ??= existingData.vehicleCount;
            _primaryTransportMode ??= existingData.primaryTransportModeToWork;
          }

          return Form(
            key: _formKey,
            child: ListView(
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
                  initialValue: _householdIncome,
                  validator: (value) => value == null ? 'This field is required' : null,
                  hint: const Text('Select a range'),
                  items: ['<25k', '25k-50k', '50k-100k', '100k-200k', '>200k', 'prefer_not_to_say']
                      .map((label) => DropdownMenuItem(value: label, child: Text(label)))
                      .toList(),
                  onChanged: (value) => setState(() => _householdIncome = value),
                ),
                const SizedBox(height: 24),

                // --- Question 2 ---
                Text('How many vehicles does your household own?', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                DropdownButtonFormField<int>(
                  initialValue: _vehicleCount,
                  validator: (value) => value == null ? 'This field is required' : null,
                  hint: const Text('Select a count'),
                  items: [0, 1, 2, 3, 4, 5]
                      .map((count) => DropdownMenuItem(value: count, child: Text(count == 5 ? '5+' : count.toString())))
                      .toList(),
                  onChanged: (value) => setState(() => _vehicleCount = value),
                ),
                const SizedBox(height: 24),
                
                // --- Question 3 ---
                Text('What is your primary mode of transport to work/college?', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                DropdownButtonFormField<String>(
                  initialValue: _primaryTransportMode,
                  validator: (value) => value == null ? 'This field is required' : null,
                  hint: const Text('Select a mode'),
                  items: const [
                    DropdownMenuItem(value: 'private_car', child: Text('Private Car')),
                    DropdownMenuItem(value: 'private_bike', child: Text('Private Bike/Scooter')),
                    DropdownMenuItem(value: 'public_transport', child: Text('Public Transport (Bus/Train)')),
                    DropdownMenuItem(value: 'walk_cycle', child: Text('Walk / Cycle')),
                    DropdownMenuItem(value: 'work_from_home', child: Text('Work from Home')),
                    DropdownMenuItem(value: 'other', child: Text('Other')),
                  ],
                  onChanged: (value) => setState(() => _primaryTransportMode = value),
                ),
                const SizedBox(height: 40),

                ElevatedButton(
                  onPressed: _isLoading ? null : _submitSurvey,
                  child: _isLoading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Submit Survey'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}