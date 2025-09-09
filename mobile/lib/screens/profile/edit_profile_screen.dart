// lib/screens/profile/edit_profile_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

class EditProfileScreen extends StatefulWidget {
  final Map<String, dynamic> userData;
  const EditProfileScreen({super.key, required this.userData});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  late TextEditingController _nameController;
  String? _selectedCurrency;
  String? _selectedLanguage;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.userData['name'] ?? '');
    _selectedCurrency = widget.userData['preferences']?['currency'] ?? 'INR';
    _selectedLanguage = widget.userData['preferences']?['language'] ?? 'en';
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }
  
  void _pickImage() async {
    final ImagePicker picker = ImagePicker();
    // In a real app, you would upload this file to your backend
    final XFile? image = await picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      // TODO: Handle image upload logic
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
        title: Text('Edit Profile', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Center(
            child: Stack(
              children: [
                CircleAvatar(
                  radius: 50,
                  backgroundImage: (widget.userData['profileImage'] as String?)?.isNotEmpty ?? false
                      ? NetworkImage(widget.userData['profileImage'])
                      : null,
                  child: (widget.userData['profileImage'] as String?)?.isEmpty ?? true
                      ? const Icon(Icons.person, size: 50)
                      : null,
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: CircleAvatar(
                    radius: 18,
                    backgroundColor: Theme.of(context).primaryColor,
                    child: IconButton(
                      icon: const Icon(Icons.edit, size: 18, color: Colors.white),
                      onPressed: _pickImage,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          TextFormField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 20),
          DropdownButtonFormField<String>(
            value: _selectedCurrency,
            decoration: const InputDecoration(labelText: 'Preferred Currency', border: OutlineInputBorder()),
            items: ['INR', 'USD', 'EUR']
                .map((label) => DropdownMenuItem(value: label, child: Text(label)))
                .toList(),
            onChanged: (value) {
              setState(() => _selectedCurrency = value);
            },
          ),
          const SizedBox(height: 20),
          DropdownButtonFormField<String>(
            value: _selectedLanguage,
            decoration: const InputDecoration(labelText: 'Language', border: OutlineInputBorder()),
            items: ['en', 'hi', 'es']
                .map((langCode) => DropdownMenuItem(value: langCode, child: Text({'en': 'English', 'hi': 'Hindi', 'es': 'Spanish'}[langCode]!)))
                .toList(),
            onChanged: (value) {
              setState(() => _selectedLanguage = value);
            },
          ),
          const SizedBox(height: 40),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                // TODO: Add logic to call the updateUserProfile API
              },
              child: const Text('Save Changes'),
            ),
          ),
        ],
      ),
    );
  }
}