// lib/screens/profile/enhanced_edit_profile_screen.dart

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/models/user_model.dart';
import 'package:mobile/services/api_client.dart';
import 'package:mobile/services/user_service.dart';
import 'package:mobile/widgets/profile/basic_info_section.dart';
import 'package:mobile/widgets/profile/location_section.dart';
import 'package:mobile/widgets/profile/preferences_section.dart';
import 'package:mobile/widgets/profile/consent_section.dart';
import 'package:mobile/widgets/profile/household_section.dart';
import 'package:mobile/widgets/profile/security_section.dart';

class EnhancedEditProfileScreen extends StatefulWidget {
  final User user;
  const EnhancedEditProfileScreen({super.key, required this.user});

  @override
  State<EnhancedEditProfileScreen> createState() =>
      _EnhancedEditProfileScreenState();
}

class _EnhancedEditProfileScreenState extends State<EnhancedEditProfileScreen>
    with TickerProviderStateMixin {
  final _userService = UserService();
  late TabController _tabController;

  // Basic Information
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  File? _newProfileImage;
  String? _profileImageUrl;

  // Location Information
  late TextEditingController _cityController;
  late TextEditingController _countryController;
  List<double>? _coordinates;

  // Preferences
  String? _selectedCurrency;
  String? _selectedLanguage;
  String? _selectedTheme;
  bool _notificationsEnabled = true;
  bool _dataAnalyticsEnabled = true;

  // Consent Management
  final Map<String, bool> _consents = {
    'data_collection': false,
    'demographic_data': false,
    'passive_tracking': false,
    'marketing_communications': false,
    'research_participation': false,
  };

  // Household Information
  String? _householdSize;
  String? _householdType;
  bool _isHouseholdHead = false;

  bool _isLoading = false;
  bool _hasUnsavedChanges = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 6, vsync: this);
    _initializeControllers();
    _loadUserData();
  }

  void _initializeControllers() {
    final user = widget.user;

    // Basic info
    _nameController = TextEditingController(text: user.name);
    _emailController = TextEditingController(text: user.email);
    _profileImageUrl = user.profileImage;

    // Location
    _cityController = TextEditingController(text: user.location?.city ?? '');
    _countryController =
        TextEditingController(text: user.location?.country ?? '');
    _coordinates = user.location?.coordinates;

    // Preferences
    _selectedCurrency = user.preferences?.currency ?? 'USD';
    _selectedLanguage = user.preferences?.language ?? 'en';

    // Consents
    for (final consentType in _consents.keys) {
      _consents[consentType] = user.hasConsent(consentType);
    }

    // Add change listeners
    _nameController.addListener(_onDataChanged);
    _cityController.addListener(_onDataChanged);
    _countryController.addListener(_onDataChanged);
  }

  void _loadUserData() {
    // Load additional user data that might not be in the basic user object
    // This could include demographics, household info, etc.
  }

  void _onDataChanged() {
    if (!_hasUnsavedChanges) {
      setState(() {
        _hasUnsavedChanges = true;
      });
    }
  }

  Future<void> _pickImage() async {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 800,
      maxHeight: 800,
      imageQuality: 85,
    );
    if (image != null) {
      setState(() {
        _newProfileImage = File(image.path);
      });
      _uploadPhoto();
    }
  }

  Future<void> _uploadPhoto() async {
    if (_newProfileImage == null) return;
    setState(() => _isLoading = true);
    try {
      final updatedUser =
          await _userService.uploadProfilePhoto(_newProfileImage!);
      setState(() {
        _profileImageUrl = updatedUser.profileImage;
        _newProfileImage = null;
      });
      _showSuccessMessage('Profile photo updated!');
    } on ApiException catch (e) {
      _showErrorMessage('Upload failed: ${e.message}');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveBasicInfo() async {
    setState(() => _isLoading = true);
    try {
      await _userService.updateUserProfile(
        name: _nameController.text,
        currency: _selectedCurrency,
        language: _selectedLanguage,
      );
      _showSuccessMessage('Basic information updated!');
      setState(() => _hasUnsavedChanges = false);
    } on ApiException catch (e) {
      _showErrorMessage('Error: ${e.message}');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveLocation() async {
    setState(() => _isLoading = true);
    try {
      await _userService.updateUserProfile(
        city: _cityController.text.isEmpty ? null : _cityController.text,
        country:
            _countryController.text.isEmpty ? null : _countryController.text,
      );
      _showSuccessMessage('Location updated!');
    } on ApiException catch (e) {
      _showErrorMessage('Error: ${e.message}');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveConsents() async {
    setState(() => _isLoading = true);
    try {
      // Update each consent individually
      for (final entry in _consents.entries) {
        final currentConsent = widget.user.getConsent(entry.key);
        final newConsent = entry.value ? 'granted' : 'revoked';

        if (currentConsent != newConsent) {
          // Call the consent update API
          // This would need to be implemented in the user service
          await _userService.updateConsent(entry.key, newConsent);
        }
      }
      _showSuccessMessage('Privacy preferences updated!');
    } on ApiException catch (e) {
      _showErrorMessage('Error: ${e.message}');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showSuccessMessage(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _showErrorMessage(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<bool> _onWillPop() async {
    if (!_hasUnsavedChanges) return true;

    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Unsaved Changes'),
            content: const Text(
                'You have unsaved changes. Do you want to discard them?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Discard'),
              ),
            ],
          ),
        ) ??
        false;
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: _onWillPop,
      child: Scaffold(
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
          title: Text(
            'Enhanced Profile Settings',
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
          bottom: TabBar(
            controller: _tabController,
            isScrollable: true,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            indicatorColor: Colors.white,
            tabs: const [
              Tab(icon: Icon(Icons.person), text: 'Basic'),
              Tab(icon: Icon(Icons.location_on), text: 'Location'),
              Tab(icon: Icon(Icons.settings), text: 'Preferences'),
              Tab(icon: Icon(Icons.privacy_tip), text: 'Privacy'),
              Tab(icon: Icon(Icons.home), text: 'Household'),
              Tab(icon: Icon(Icons.security), text: 'Security'),
            ],
          ),
        ),
        body: TabBarView(
          controller: _tabController,
          children: [
            // Basic Information Tab
            BasicInfoSection(
              nameController: _nameController,
              emailController: _emailController,
              profileImageUrl: _profileImageUrl,
              newProfileImage: _newProfileImage,
              selectedCurrency: _selectedCurrency,
              selectedLanguage: _selectedLanguage,
              isLoading: _isLoading,
              onImagePick: _pickImage,
              onCurrencyChanged: (value) {
                setState(() {
                  _selectedCurrency = value;
                  _onDataChanged();
                });
              },
              onLanguageChanged: (value) {
                setState(() {
                  _selectedLanguage = value;
                  _onDataChanged();
                });
              },
              onSave: _saveBasicInfo,
            ),

            // Location Tab
            LocationSection(
              cityController: _cityController,
              countryController: _countryController,
              coordinates: _coordinates,
              isLoading: _isLoading,
              onLocationUpdate: (coordinates) {
                setState(() {
                  _coordinates = coordinates;
                  _onDataChanged();
                });
              },
              onSave: _saveLocation,
            ),

            // Preferences Tab
            PreferencesSection(
              notificationsEnabled: _notificationsEnabled,
              dataAnalyticsEnabled: _dataAnalyticsEnabled,
              selectedTheme: _selectedTheme,
              onNotificationsChanged: (value) {
                setState(() {
                  _notificationsEnabled = value;
                  _onDataChanged();
                });
              },
              onAnalyticsChanged: (value) {
                setState(() {
                  _dataAnalyticsEnabled = value;
                  _onDataChanged();
                });
              },
              onThemeChanged: (value) {
                setState(() {
                  _selectedTheme = value;
                  _onDataChanged();
                });
              },
            ),

            // Privacy & Consent Tab
            ConsentSection(
              consents: _consents,
              onConsentChanged: (consentType, value) {
                setState(() {
                  _consents[consentType] = value;
                  _onDataChanged();
                });
              },
              onSave: _saveConsents,
            ),

            // Household Management Tab
            HouseholdSection(
              user: widget.user,
              householdSize: _householdSize,
              householdType: _householdType,
              isHouseholdHead: _isHouseholdHead,
              onHouseholdSizeChanged: (value) {
                setState(() {
                  _householdSize = value;
                  _onDataChanged();
                });
              },
              onHouseholdTypeChanged: (value) {
                setState(() {
                  _householdType = value;
                  _onDataChanged();
                });
              },
              onHouseholdHeadChanged: (value) {
                setState(() {
                  _isHouseholdHead = value;
                  _onDataChanged();
                });
              },
            ),

            // Security Tab
            SecuritySection(
              user: widget.user,
              onPasswordChange: () {
                // Navigate to change password screen
              },
              onAccountStatusInfo: () {
                // Show account status information
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    _emailController.dispose();
    _cityController.dispose();
    _countryController.dispose();
    super.dispose();
  }
}
