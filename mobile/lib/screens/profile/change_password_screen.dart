// lib/screens/profile/change_password_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ChangePasswordScreen extends StatelessWidget {
  const ChangePasswordScreen({super.key});

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
        title: Text('Change Password', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 20),
            Text(
              'Your new password must be different from previously used passwords.',
              style: GoogleFonts.poppins(fontSize: 15, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 32),
            _buildPasswordField(label: 'Current Password'),
            const SizedBox(height: 20),
            _buildPasswordField(label: 'New Password'),
            const SizedBox(height: 20),
            _buildPasswordField(label: 'Confirm New Password'),
            const SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  // TODO: Add logic to call the updatePassword API
                },
                child: const Text('Save Changes'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Helper widget for password text fields
  Widget _buildPasswordField({required String label}) {
    return TextFormField(
      obscureText: true,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
    );
  }
}