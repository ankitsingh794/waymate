// lib/screens/household/enhanced_household_survey_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/services/household_service.dart';
import 'package:mobile/services/survey_service.dart';
import 'package:mobile/models/household_models.dart';
import 'package:mobile/models/socio_economic_survey_models.dart';
import 'package:mobile/theme/theme.dart';

/// Enhanced household survey screen that utilizes all household and survey endpoints
class EnhancedHouseholdSurveyScreen extends StatefulWidget {
  final Household? household;

  const EnhancedHouseholdSurveyScreen({
    super.key,
    this.household,
  });

  @override
  State<EnhancedHouseholdSurveyScreen> createState() =>
      _EnhancedHouseholdSurveyScreenState();
}

class _EnhancedHouseholdSurveyScreenState
    extends State<EnhancedHouseholdSurveyScreen>
    with SingleTickerProviderStateMixin {
  final HouseholdService _householdService = HouseholdService();
  final SurveyService _surveyService = SurveyService();

  late TabController _tabController;
  bool _isLoading = false;
  String? _error;

  // Survey data
  SocioEconomicSurvey? _currentSurvey;

  // Form controllers
  final _formKey = GlobalKey<FormState>();
  String? _selectedIncome;
  int? _vehicleCount;
  String? _primaryTransportMode;

  // Household management
  String? _inviteLink;
  bool _isGeneratingInvite = false;

  final List<String> _incomeOptions = [
    '<25k',
    '25k-50k',
    '50k-100k',
    '100k-200k',
    '>200k',
    'prefer_not_to_say'
  ];

  final List<String> _transportModes = [
    'private_car',
    'private_bike',
    'public_transport',
    'walk_cycle',
    'work_from_home',
    'other'
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadSurveyData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadSurveyData() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final survey = await _surveyService.getMySurveyData();

      setState(() {
        _currentSurvey = survey;
        if (survey != null) {
          _selectedIncome = survey.householdIncome;
          _vehicleCount = survey.vehicleCount;
          _primaryTransportMode = survey.primaryTransportModeToWork;
        }
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load survey data: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  Future<void> _saveSurveyData() async {
    if (!_formKey.currentState!.validate()) return;

    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final survey = SocioEconomicSurvey(
        userId: _currentSurvey?.userId ?? '',
        householdIncome: _selectedIncome,
        vehicleCount: _vehicleCount,
        primaryTransportModeToWork: _primaryTransportMode,
      );

      final result = await _surveyService.submitOrUpdateSurveyData(survey);

      setState(() {
        _currentSurvey = result;
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Survey data saved successfully'),
            backgroundColor: Colors.green,
            action: SnackBarAction(
              label: 'OK',
              textColor: Colors.white,
              onPressed: () {},
            ),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to save survey: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  Future<void> _generateInviteLink() async {
    if (widget.household == null) return;

    try {
      setState(() {
        _isGeneratingInvite = true;
        _error = null;
      });

      final link =
          await _householdService.generateInviteLink(widget.household!.id);

      setState(() {
        _inviteLink = link;
        _isGeneratingInvite = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to generate invite: ${e.toString()}';
        _isGeneratingInvite = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(
          'Household & Survey',
          style: GoogleFonts.poppins(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        backgroundColor: primaryColor,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: accentColor,
          tabs: const [
            Tab(text: 'Survey', icon: Icon(Icons.assignment)),
            Tab(text: 'Household', icon: Icon(Icons.home)),
            Tab(text: 'Members', icon: Icon(Icons.people)),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildSurveyTab(),
                _buildHouseholdTab(),
                _buildMembersTab(),
              ],
            ),
    );
  }

  Widget _buildSurveyTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader(
              'Socio-Economic Survey',
              'Help us understand transportation patterns',
              Icons.analytics,
            ),
            const SizedBox(height: 20),

            // Household Income
            _buildDropdownField(
              'Household Income',
              'Select your household income range',
              _selectedIncome,
              _incomeOptions
                  .map((income) => DropdownMenuItem(
                        value: income,
                        child: Text(_formatIncomeLabel(income)),
                      ))
                  .toList(),
              (value) => setState(() => _selectedIncome = value),
            ),
            const SizedBox(height: 20),

            // Vehicle Count
            _buildNumberField(
              'Number of Vehicles',
              'How many vehicles does your household own?',
              _vehicleCount,
              (value) => setState(() => _vehicleCount = value),
            ),
            const SizedBox(height: 20),

            // Primary Transport Mode
            _buildDropdownField(
              'Primary Transport to Work',
              'Your main mode of transportation to work',
              _primaryTransportMode,
              _transportModes
                  .map((mode) => DropdownMenuItem(
                        value: mode,
                        child: Text(_formatTransportModeLabel(mode)),
                      ))
                  .toList(),
              (value) => setState(() => _primaryTransportMode = value),
            ),
            const SizedBox(height: 30),

            // Save Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _saveSurveyData,
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : Text(
                        'Save Survey Data',
                        style: GoogleFonts.poppins(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: 16),
              _buildErrorCard(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildHouseholdTab() {
    if (widget.household == null) {
      return _buildNoHouseholdWidget();
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader(
            'Household Management',
            'Manage your household settings and members',
            Icons.home,
          ),
          const SizedBox(height: 20),

          // Household Info Card
          _buildHouseholdInfoCard(),
          const SizedBox(height: 20),

          // Invite Management
          _buildInviteManagementCard(),
          const SizedBox(height: 20),

          // Household Actions
          _buildHouseholdActionsCard(),
        ],
      ),
    );
  }

  Widget _buildMembersTab() {
    if (widget.household == null) {
      return _buildNoHouseholdWidget();
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader(
            'Household Members',
            'Manage members and their roles',
            Icons.people,
          ),
          const SizedBox(height: 20),

          // Members List
          ...widget.household!.members
              .map((member) => _buildMemberCard(member)),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, String subtitle, IconData icon) {
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
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey[800],
                  ),
                ),
                Text(
                  subtitle,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
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

  Widget _buildDropdownField(
    String label,
    String hint,
    String? value,
    List<DropdownMenuItem<String>> items,
    Function(String?) onChanged,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.grey[800],
          ),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          initialValue: value,
          decoration: InputDecoration(
            hintText: hint,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            filled: true,
            fillColor: Colors.white,
          ),
          items: items,
          onChanged: onChanged,
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Please select an option';
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildNumberField(
    String label,
    String hint,
    int? value,
    Function(int?) onChanged,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.grey[800],
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          initialValue: value?.toString(),
          decoration: InputDecoration(
            hintText: hint,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            filled: true,
            fillColor: Colors.white,
          ),
          keyboardType: TextInputType.number,
          onChanged: (val) => onChanged(int.tryParse(val)),
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Please enter a number';
            }
            final num = int.tryParse(value);
            if (num == null || num < 0) {
              return 'Please enter a valid number';
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildHouseholdInfoCard() {
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.info, color: primaryColor),
              const SizedBox(width: 8),
              Text(
                'Household Information',
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildInfoRow('Name', widget.household!.householdName),
          _buildInfoRow('Members', '${widget.household!.members.length}'),
          _buildInfoRow(
              'Head',
              widget.household!.members.isNotEmpty
                  ? widget.household!.members.first.user.name
                  : 'Unknown'),
          _buildInfoRow('ID', widget.household!.anonymizedId),
        ],
      ),
    );
  }

  Widget _buildInviteManagementCard() {
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.person_add, color: accentColor),
              const SizedBox(width: 8),
              Text(
                'Invite Management',
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_inviteLink != null) ...[
            Text(
              'Invite Link Generated:',
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                _inviteLink!,
                style: GoogleFonts.robotoMono(fontSize: 12),
              ),
            ),
            const SizedBox(height: 12),
          ],
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isGeneratingInvite ? null : _generateInviteLink,
              style: ElevatedButton.styleFrom(
                backgroundColor: accentColor,
                foregroundColor: Colors.white,
              ),
              child: _isGeneratingInvite
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Generate Invite Link'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHouseholdActionsCard() {
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.settings, color: Colors.grey[600]),
              const SizedBox(width: 8),
              Text(
                'Household Actions',
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    // Edit household name
                  },
                  child: const Text('Edit Name'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    // Leave household
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                  ),
                  child: const Text('Leave'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMemberCard(HouseholdMember member) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
          CircleAvatar(
            backgroundColor: primaryColor.withOpacity(0.1),
            child: Text(
              member.user.name[0].toUpperCase(),
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.bold,
                color: primaryColor,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  member.user.name,
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  member.role,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          if (member.role != 'head')
            PopupMenuButton<String>(
              onSelected: (value) {
                // Handle member actions
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'edit',
                  child: Text('Edit Role'),
                ),
                const PopupMenuItem(
                  value: 'remove',
                  child: Text('Remove'),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildNoHouseholdWidget() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.home_outlined, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            'No Household Found',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Create or join a household to access these features',
            style: GoogleFonts.poppins(
              fontSize: 14,
              color: Colors.grey[600],
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {
              // Navigate to create household
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryColor,
              foregroundColor: Colors.white,
            ),
            child: const Text('Create Household'),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Text(
            '$label: ',
            style: GoogleFonts.poppins(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Colors.grey[700],
            ),
          ),
          Text(
            value,
            style: GoogleFonts.poppins(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorCard() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.error, color: Colors.red[700], size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _error!,
              style: GoogleFonts.poppins(
                fontSize: 12,
                color: Colors.red[700],
              ),
            ),
          ),
          IconButton(
            icon: Icon(Icons.close, color: Colors.red[700], size: 16),
            onPressed: () => setState(() => _error = null),
          ),
        ],
      ),
    );
  }

  String _formatIncomeLabel(String income) {
    switch (income) {
      case '<25k':
        return 'Less than \$25,000';
      case '25k-50k':
        return '\$25,000 - \$50,000';
      case '50k-100k':
        return '\$50,000 - \$100,000';
      case '100k-200k':
        return '\$100,000 - \$200,000';
      case '>200k':
        return 'More than \$200,000';
      case 'prefer_not_to_say':
        return 'Prefer not to say';
      default:
        return income;
    }
  }

  String _formatTransportModeLabel(String mode) {
    switch (mode) {
      case 'private_car':
        return 'Private Car';
      case 'private_bike':
        return 'Private Bike/Motorcycle';
      case 'public_transport':
        return 'Public Transport';
      case 'walk_cycle':
        return 'Walk/Cycle';
      case 'work_from_home':
        return 'Work from Home';
      case 'other':
        return 'Other';
      default:
        return mode;
    }
  }
}
