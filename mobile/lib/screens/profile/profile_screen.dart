// lib/screens/profile/profile_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/screens/profile/change_password_screen.dart';
import 'package:mobile/screens/profile/edit_profile_screen.dart';
import 'package:mobile/screens/profile/household_management_screen.dart';
import 'package:mobile/screens/profile/privacy_consent_screen.dart';
import 'package:mobile/screens/researcher/researcher_tools_screen.dart';
import 'package:mobile/services/user_service.dart';
import 'package:mobile/widgets/survey_card.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final UserService _userService = UserService();
  late Future<Map<String, dynamic>> _userProfileFuture;
  bool _showSurveyCard = true;

  @override
  void initState() {
    super.initState();
    _userProfileFuture = _userService.getUserProfile();
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
        future: _userProfileFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text('No user data found.'));
          }

          final user = snapshot.data!;
          final String userRole = user['role'] ?? 'user';
          final String profileImageUrl = user['profileImage'] ?? '';

          return ListView(
            children: [
              if (_showSurveyCard)
                SurveyCard(onDismiss: () {
                  setState(() {
                    _showSurveyCard = false;
                  });
                }),
              const SizedBox(height: 20),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 35,
                      backgroundImage: profileImageUrl.isNotEmpty
                          ? NetworkImage(profileImageUrl)
                          : null,
                      child: profileImageUrl.isEmpty
                          ? const Icon(Icons.person, size: 35)
                          : null,
                    ),
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user['name'] ?? 'User Name',
                            style: GoogleFonts.poppins(
                                fontSize: 20, fontWeight: FontWeight.bold)),
                        Text(user['email'] ?? 'user.email@example.com',
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
                onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) =>
                            EditProfileScreen(userData: user))),
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
              _buildSectionHeader('Settings'),
              _buildMenuOption(
                icon: Icons.lock_outline,
                title: 'Privacy & Consent',
                onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const PrivacyConsentScreen())),
              ),
              if (userRole == 'researcher') ...[
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
                  onPressed: () {/* TODO: Add logout logic */},
                  child: Text('Logout',
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

  // Helper methods are now correctly part of the State class
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

  Widget _buildMenuOption(
      {required IconData icon,
      required String title,
      required VoidCallback onTap}) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title, style: GoogleFonts.poppins()),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}
