// lib/screens/profile/profile_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/models/socio_economic_survey_models.dart';
import 'package:mobile/models/user_model.dart';
import 'package:mobile/screens/profile/change_password_screen.dart';
import 'package:mobile/screens/profile/edit_profile_screen.dart';
import 'package:mobile/screens/profile/enhanced_edit_profile_screen.dart';
import 'package:mobile/screens/profile/household_management_screen.dart';
import 'package:mobile/screens/profile/privacy_consent_screen.dart';
import 'package:mobile/screens/profile/survey_screen.dart';
import 'package:mobile/screens/researcher/researcher_tools_screen.dart';
import 'package:mobile/screens/trip_details/join_trip_screen.dart';
import 'package:mobile/services/auth_service.dart';
import 'package:mobile/services/survey_service.dart'; // --- NEW: Import SurveyService ---
import 'package:mobile/services/user_service.dart';
import 'package:mobile/widgets/survey_card.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final UserService _userService = UserService();
  final AuthService _authService = AuthService();
  final SurveyService _surveyService =
      SurveyService(); // --- NEW: Instantiate SurveyService ---

  // --- UPDATED: Future now fetches a map of all required data ---
  late Future<Map<String, dynamic>> _profileDataFuture;
  bool _isLoggingOut = false;

  @override
  void initState() {
    super.initState();
    _loadProfileData();
  }

  void _loadProfileData() {
    setState(() {
      _profileDataFuture = _fetchAllProfileData();
    });
  }

  // --- NEW: A method to fetch user and survey data concurrently for performance ---
  Future<Map<String, dynamic>> _fetchAllProfileData() async {
    try {
      final results = await Future.wait([
        _userService.getUserProfile(),
        _surveyService.getMySurveyData(),
      ]);
      return {
        'user': results[0] as User,
        'survey': results[1] as SocioEconomicSurvey?,
      };
    } catch (e) {
      rethrow;
    }
  }

  Future<void> _logout() async {
    setState(() => _isLoggingOut = true);
    await _authService.logout();

    if (mounted) {
      // Use go_router navigation instead of imperative Navigator
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
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
        title: Text('Profile & Settings',
            style: GoogleFonts.poppins(
                color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _profileDataFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          if (!snapshot.hasData) {
            return const Center(child: Text('No user data found.'));
          }

          final User user = snapshot.data!['user'];
          final SocioEconomicSurvey? survey = snapshot.data!['survey'];
          final bool shouldShowSurveyCard =
              survey == null; // Logic to show card

          return ListView(
            children: [
              // --- UPDATED: Conditionally render the SurveyCard ---
              if (shouldShowSurveyCard)
                SurveyCard(
                  onDismiss: () {
                    // This could be enhanced to hide for the session,
                    // but it will reappear on next app launch, which is intended.
                  },
                  onTakeSurvey: () async {
                    final surveyCompleted = await Navigator.push<bool>(
                      context,
                      MaterialPageRoute(
                          builder: (context) => const SurveyScreen()),
                    );
                    // If SurveyScreen pops with 'true', it means the survey was submitted.
                    if (surveyCompleted == true) {
                      _loadProfileData(); // Reload data to hide the card
                    }
                  },
                ),
              const SizedBox(height: 20),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 35,
                      backgroundImage: (user.profileImage != null &&
                              user.profileImage!.isNotEmpty)
                          ? NetworkImage(user.profileImage!)
                          : null,
                      child: (user.profileImage == null ||
                              user.profileImage!.isEmpty)
                          ? const Icon(Icons.person, size: 35)
                          : null,
                    ),
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user.name,
                            style: GoogleFonts.poppins(
                                fontSize: 20, fontWeight: FontWeight.bold)),
                        Text(user.email,
                            style: GoogleFonts.poppins(
                                fontSize: 14, color: Colors.grey.shade600)),
                      ],
                    ),
                  ],
                ),
              ),
              const Divider(height: 40),
              _buildSectionHeader('Account'),
              _buildMenuOption(
                icon: Icons.person_outline,
                title: 'Edit Profile',
                onTap: () async {
                  final updatedUser = await Navigator.push<User>(
                    context,
                    MaterialPageRoute(
                        builder: (context) => EditProfileScreen(user: user)),
                  );
                  if (updatedUser != null) {
                    _loadProfileData();
                  }
                },
              ),
              _buildMenuOption(
                icon: Icons.settings_outlined,
                title: 'Enhanced Profile Settings',
                subtitle: 'Advanced profile management',
                onTap: () async {
                  final updatedUser = await Navigator.push<User>(
                    context,
                    MaterialPageRoute(
                        builder: (context) => EnhancedEditProfileScreen(user: user)),
                  );
                  if (updatedUser != null) {
                    _loadProfileData();
                  }
                },
              ),
              _buildMenuOption(
                icon: Icons.shield_outlined,
                title: 'Change Password',
                onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const ChangePasswordScreen())),
              ),
              const SizedBox(height: 20),
              _buildSectionHeader('Household'),
              _buildMenuOption(
                icon: Icons.home_outlined,
                title: 'Manage Household',
                onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) =>
                            const HouseholdManagementScreen())),
              ),
              const SizedBox(height: 20),
              _buildSectionHeader('Trips'),
              _buildMenuOption(
                icon: Icons.group_add,
                title: 'Join Trip',
                subtitle: 'Join a trip using an invite token',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) => const JoinTripScreen()),
                ),
              ),
              const SizedBox(height: 20),
              _buildSectionHeader('Settings'),
              _buildMenuOption(
                icon: Icons.lock_outline,
                title: 'Privacy & Consent',
                onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const PrivacyConsentScreen())),
              ),
              if (user.role == 'researcher') ...[
                const SizedBox(height: 20),
                _buildSectionHeader('Researcher'),
                _buildMenuOption(
                  icon: Icons.science_outlined,
                  title: 'Researcher Tools',
                  onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (context) => const ResearcherToolsScreen())),
                ),
              ],
              const Divider(height: 40),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: TextButton(
                  onPressed: _isLoggingOut ? null : _logout,
                  child: _isLoggingOut
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : Text('Logout',
                          style: GoogleFonts.poppins(
                              color: Colors.red.shade700,
                              fontSize: 16,
                              fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      child: Text(
        title.toUpperCase(),
        style: GoogleFonts.poppins(
          color: Colors.grey.shade600,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }

  Widget _buildMenuOption({
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title, style: GoogleFonts.poppins()),
      subtitle: subtitle != null
          ? Text(
              subtitle,
              style: GoogleFonts.poppins(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            )
          : null,
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}
