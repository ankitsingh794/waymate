// lib/widgets/profile/basic_info_section.dart

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class BasicInfoSection extends StatelessWidget {
  final TextEditingController nameController;
  final TextEditingController emailController;
  final String? profileImageUrl;
  final File? newProfileImage;
  final String? selectedCurrency;
  final String? selectedLanguage;
  final bool isLoading;
  final VoidCallback onImagePick;
  final ValueChanged<String?> onCurrencyChanged;
  final ValueChanged<String?> onLanguageChanged;
  final VoidCallback onSave;

  const BasicInfoSection({
    super.key,
    required this.nameController,
    required this.emailController,
    this.profileImageUrl,
    this.newProfileImage,
    this.selectedCurrency,
    this.selectedLanguage,
    required this.isLoading,
    required this.onImagePick,
    required this.onCurrencyChanged,
    required this.onLanguageChanged,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Profile Photo Section
          Center(
            child: Stack(
              children: [
                CircleAvatar(
                  radius: 60,
                  backgroundImage: newProfileImage != null
                      ? FileImage(newProfileImage!)
                      : (profileImageUrl != null && profileImageUrl!.isNotEmpty
                          ? NetworkImage(profileImageUrl!)
                          : null) as ImageProvider?,
                  child: profileImageUrl == null && newProfileImage == null
                      ? const Icon(Icons.person, size: 60)
                      : null,
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).primaryColor,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.camera_alt, color: Colors.white),
                      onPressed: onImagePick,
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Name Field
          Text(
            'Personal Information',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 16),
          
          TextFormField(
            controller: nameController,
            decoration: InputDecoration(
              labelText: 'Full Name',
              prefixIcon: const Icon(Icons.person_outline),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: Colors.grey[50],
            ),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Please enter your full name';
              }
              return null;
            },
          ),
          
          const SizedBox(height: 16),
          
          // Email Field (Read-only)
          TextFormField(
            controller: emailController,
            enabled: false,
            decoration: InputDecoration(
              labelText: 'Email Address',
              prefixIcon: const Icon(Icons.email_outlined),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: Colors.grey[100],
              helperText: 'Email cannot be changed here. Contact support if needed.',
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Preferences Section
          Text(
            'Preferences',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 16),
          
          // Currency Dropdown
          DropdownButtonFormField<String>(
            initialValue: selectedCurrency,
            decoration: InputDecoration(
              labelText: 'Preferred Currency',
              prefixIcon: const Icon(Icons.attach_money),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: Colors.grey[50],
            ),
            items: const [
              DropdownMenuItem(value: 'INR', child: Text('₹ Indian Rupee (INR)')),
              DropdownMenuItem(value: 'USD', child: Text('\$ US Dollar (USD)')),
              DropdownMenuItem(value: 'EUR', child: Text('€ Euro (EUR)')),
              DropdownMenuItem(value: 'GBP', child: Text('£ British Pound (GBP)')),
              DropdownMenuItem(value: 'JPY', child: Text('¥ Japanese Yen (JPY)')),
              DropdownMenuItem(value: 'CAD', child: Text('\$ Canadian Dollar (CAD)')),
              DropdownMenuItem(value: 'AUD', child: Text('\$ Australian Dollar (AUD)')),
            ],
            onChanged: onCurrencyChanged,
          ),
          
          const SizedBox(height: 16),
          
          // Language Dropdown
          DropdownButtonFormField<String>(
            initialValue: selectedLanguage,
            decoration: InputDecoration(
              labelText: 'Language',
              prefixIcon: const Icon(Icons.language),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: Colors.grey[50],
            ),
            items: const [
              DropdownMenuItem(value: 'en', child: Text('English')),
              DropdownMenuItem(value: 'hi', child: Text('हिंदी (Hindi)')),
              DropdownMenuItem(value: 'es', child: Text('Español (Spanish)')),
              DropdownMenuItem(value: 'fr', child: Text('Français (French)')),
              DropdownMenuItem(value: 'de', child: Text('Deutsch (German)')),
              DropdownMenuItem(value: 'zh', child: Text('中文 (Chinese)')),
              DropdownMenuItem(value: 'ja', child: Text('日本語 (Japanese)')),
            ],
            onChanged: onLanguageChanged,
          ),
          
          const SizedBox(height: 32),
          
          // Save Button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: isLoading ? null : onSave,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color.fromARGB(255, 87, 184, 203),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 2,
              ),
              child: isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      'Save Basic Information',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Information Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue[200]!),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.blue[600]),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Your profile information helps us personalize your experience and provide better recommendations.',
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      color: Colors.blue[800],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}