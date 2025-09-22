// lib/screens/profile/privacy_consent_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/user_model.dart';
import 'package:mobile/services/user_service.dart';

class PrivacyConsentScreen extends StatefulWidget {
  const PrivacyConsentScreen({super.key});

  @override
  State<PrivacyConsentScreen> createState() => _PrivacyConsentScreenState();
}

class _PrivacyConsentScreenState extends State<PrivacyConsentScreen> {
  final UserService _userService = UserService();
  User? _user;
  bool _isLoading = true;
  final Map<String, bool> _pendingUpdates = {};

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    try {
      if (mounted) setState(() => _isLoading = true);
      final user = await _userService.getUserProfile();
      if (mounted) {
        setState(() {
          _user = user;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load settings: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _updateConsent(String consentType, bool isGranted) async {
    if (_user == null) return;

    // Show pending state
    if (mounted) {
      setState(() {
        _pendingUpdates[consentType] = true;
      });
    }

    try {
      final status = isGranted ? 'granted' : 'revoked';
      await _userService.updateUserConsent(
          consentType: consentType, status: status);

      // Update local user state
      if (mounted) {
        setState(() {
          _user = _user!.copyWithConsent(consentType, status);
          _pendingUpdates.remove(consentType);
        });
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${_formatConsentType(consentType)} consent updated'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      // Revert the change and show error
      if (mounted) {
        setState(() {
          _pendingUpdates.remove(consentType);
        });
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _formatConsentType(String consentType) {
    return consentType
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) =>
            word.isNotEmpty ? word[0].toUpperCase() + word.substring(1) : '')
        .join(' ');
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
                Color.fromARGB(255, 14, 59, 76)
              ],
            ),
          ),
        ),
        title: Text('Privacy & Consent',
            style: GoogleFonts.poppins(
                color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _user == null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Failed to load settings',
                          style: GoogleFonts.poppins()),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadUserProfile,
                        child: Text('Retry', style: GoogleFonts.poppins()),
                      ),
                    ],
                  ),
                )
              : _buildConsentContent(),
    );
  }

  Widget _buildConsentContent() {
    return RefreshIndicator(
      onRefresh: _loadUserProfile,
      child: ListView(
        children: [
          // Info section
          Container(
            margin: const EdgeInsets.all(16.0),
            padding: const EdgeInsets.all(16.0),
            decoration: BoxDecoration(
              color: Colors.blue[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.blue[200]!),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.blue[700]),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'To support transportation research and improve your app experience, WayMate collects certain types of data. You have full control over what you share.',
                    style: GoogleFonts.poppins(
                        fontSize: 14, color: Colors.blue[800]),
                  ),
                ),
              ],
            ),
          ),

          const Divider(),

          // Data Collection Consent
          _buildConsentTile(
            'data_collection',
            'Data Collection',
            'Allow the app to collect trip data for research purposes. All data is anonymized and used for transportation planning.',
            Icons.analytics,
          ),

          // Passive Tracking Consent
          _buildConsentTile(
            'passive_tracking',
            'Passive Location Tracking',
            'Allow the app to automatically detect trips in the background to help researchers understand travel patterns.',
            Icons.location_on,
          ),

          // Demographic Data Consent
          _buildConsentTile(
            'demographic_data',
            'Share Demographic Data',
            'Allow the app to include non-identifying demographic data (like age group or gender) in research exports.',
            Icons.person,
          ),
        ],
      ),
    );
  }

  Widget _buildConsentTile(
      String consentType, String title, String description, IconData icon) {
    final isGranted = _user!.hasConsent(consentType);
    final isPending = _pendingUpdates[consentType] == true;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: SwitchListTile.adaptive(
        secondary: isPending
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2))
            : Icon(icon, color: Theme.of(context).primaryColor),
        title: Text(title,
            style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
        subtitle: Text(description, style: GoogleFonts.poppins(fontSize: 13)),
        value: isGranted,
        onChanged: isPending
            ? null
            : (bool value) {
                _updateConsent(consentType, value);
              },
      ),
    );
  }
}
