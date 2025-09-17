// lib/widgets/profile/preferences_section.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class PreferencesSection extends StatelessWidget {
  final bool notificationsEnabled;
  final bool dataAnalyticsEnabled;
  final String? selectedTheme;
  final ValueChanged<bool> onNotificationsChanged;
  final ValueChanged<bool> onAnalyticsChanged;
  final ValueChanged<String?> onThemeChanged;

  const PreferencesSection({
    super.key,
    required this.notificationsEnabled,
    required this.dataAnalyticsEnabled,
    this.selectedTheme,
    required this.onNotificationsChanged,
    required this.onAnalyticsChanged,
    required this.onThemeChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'App Preferences',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Customize your app experience',
            style: GoogleFonts.poppins(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Theme Selection
          Text(
            'Theme',
            style: GoogleFonts.poppins(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 12),
          
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  RadioListTile<String>(
                    title: Row(
                      children: [
                        const Icon(Icons.brightness_auto, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'System Default',
                          style: GoogleFonts.poppins(),
                        ),
                      ],
                    ),
                    subtitle: Text(
                      'Follow system theme settings',
                      style: GoogleFonts.poppins(fontSize: 12),
                    ),
                    value: 'system',
                    groupValue: selectedTheme ?? 'system',
                    onChanged: onThemeChanged,
                  ),
                  RadioListTile<String>(
                    title: Row(
                      children: [
                        const Icon(Icons.light_mode, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Light Theme',
                          style: GoogleFonts.poppins(),
                        ),
                      ],
                    ),
                    subtitle: Text(
                      'Always use light theme',
                      style: GoogleFonts.poppins(fontSize: 12),
                    ),
                    value: 'light',
                    groupValue: selectedTheme ?? 'system',
                    onChanged: onThemeChanged,
                  ),
                  RadioListTile<String>(
                    title: Row(
                      children: [
                        const Icon(Icons.dark_mode, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Dark Theme',
                          style: GoogleFonts.poppins(),
                        ),
                      ],
                    ),
                    subtitle: Text(
                      'Always use dark theme',
                      style: GoogleFonts.poppins(fontSize: 12),
                    ),
                    value: 'dark',
                    groupValue: selectedTheme ?? 'system',
                    onChanged: onThemeChanged,
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Notifications Section
          Text(
            'Notifications',
            style: GoogleFonts.poppins(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 12),
          
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  SwitchListTile(
                    title: Row(
                      children: [
                        const Icon(Icons.notifications, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Push Notifications',
                          style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                    subtitle: Text(
                      'Receive notifications about trips, updates, and reminders',
                      style: GoogleFonts.poppins(fontSize: 12),
                    ),
                    value: notificationsEnabled,
                    onChanged: onNotificationsChanged,
                    activeThumbColor: const Color.fromARGB(255, 87, 184, 203),
                  ),
                  const Divider(),
                  ListTile(
                    leading: const Icon(Icons.tune, size: 20),
                    title: Text(
                      'Notification Settings',
                      style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
                    ),
                    subtitle: Text(
                      'Customize specific notification types',
                      style: GoogleFonts.poppins(fontSize: 12),
                    ),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      // Navigate to detailed notification settings
                      _showNotificationSettings(context);
                    },
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Data & Analytics Section
          Text(
            'Data & Analytics',
            style: GoogleFonts.poppins(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 12),
          
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  SwitchListTile(
                    title: Row(
                      children: [
                        const Icon(Icons.analytics, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Analytics Data',
                          style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                    subtitle: Text(
                      'Help improve the app by sharing anonymous usage data',
                      style: GoogleFonts.poppins(fontSize: 12),
                    ),
                    value: dataAnalyticsEnabled,
                    onChanged: onAnalyticsChanged,
                    activeThumbColor: const Color.fromARGB(255, 87, 184, 203),
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 24),
          
          // App Behavior Section
          Text(
            'App Behavior',
            style: GoogleFonts.poppins(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 12),
          
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.map, size: 20),
                    title: Text(
                      'Default Map Type',
                      style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
                    ),
                    subtitle: Text(
                      'Standard map view',
                      style: GoogleFonts.poppins(fontSize: 12),
                    ),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      _showMapTypeSettings(context);
                    },
                  ),
                  const Divider(),
                  ListTile(
                    leading: const Icon(Icons.directions, size: 20),
                    title: Text(
                      'Default Transportation',
                      style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
                    ),
                    subtitle: Text(
                      'Public transport',
                      style: GoogleFonts.poppins(fontSize: 12),
                    ),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      _showTransportationSettings(context);
                    },
                  ),
                  const Divider(),
                  ListTile(
                    leading: const Icon(Icons.schedule, size: 20),
                    title: Text(
                      'Auto-sync Frequency',
                      style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
                    ),
                    subtitle: Text(
                      'Every 15 minutes',
                      style: GoogleFonts.poppins(fontSize: 12),
                    ),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      _showSyncSettings(context);
                    },
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 32),
          
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
                    'Your preferences are saved automatically. Changes take effect immediately.',
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

  void _showNotificationSettings(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Notification Settings',
                style: GoogleFonts.poppins(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  children: const [
                    // Notification type toggles would go here
                    Text('Detailed notification settings would be implemented here...'),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showMapTypeSettings(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Map Type'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('Standard'),
              leading: Radio<String>(
                value: 'standard',
                groupValue: 'standard',
                onChanged: (value) => Navigator.pop(context),
              ),
            ),
            ListTile(
              title: const Text('Satellite'),
              leading: Radio<String>(
                value: 'satellite',
                groupValue: 'standard',
                onChanged: (value) => Navigator.pop(context),
              ),
            ),
            ListTile(
              title: const Text('Terrain'),
              leading: Radio<String>(
                value: 'terrain',
                groupValue: 'standard',
                onChanged: (value) => Navigator.pop(context),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showTransportationSettings(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Default Transportation'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('Public Transport'),
              leading: Radio<String>(
                value: 'public',
                groupValue: 'public',
                onChanged: (value) => Navigator.pop(context),
              ),
            ),
            ListTile(
              title: const Text('Walking'),
              leading: Radio<String>(
                value: 'walking',
                groupValue: 'public',
                onChanged: (value) => Navigator.pop(context),
              ),
            ),
            ListTile(
              title: const Text('Cycling'),
              leading: Radio<String>(
                value: 'cycling',
                groupValue: 'public',
                onChanged: (value) => Navigator.pop(context),
              ),
            ),
            ListTile(
              title: const Text('Driving'),
              leading: Radio<String>(
                value: 'driving',
                groupValue: 'public',
                onChanged: (value) => Navigator.pop(context),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showSyncSettings(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Auto-sync Frequency'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('Every 5 minutes'),
              leading: Radio<String>(
                value: '5',
                groupValue: '15',
                onChanged: (value) => Navigator.pop(context),
              ),
            ),
            ListTile(
              title: const Text('Every 15 minutes'),
              leading: Radio<String>(
                value: '15',
                groupValue: '15',
                onChanged: (value) => Navigator.pop(context),
              ),
            ),
            ListTile(
              title: const Text('Every 30 minutes'),
              leading: Radio<String>(
                value: '30',
                groupValue: '15',
                onChanged: (value) => Navigator.pop(context),
              ),
            ),
            ListTile(
              title: const Text('Every hour'),
              leading: Radio<String>(
                value: '60',
                groupValue: '15',
                onChanged: (value) => Navigator.pop(context),
              ),
            ),
            ListTile(
              title: const Text('Manual only'),
              leading: Radio<String>(
                value: 'manual',
                groupValue: '15',
                onChanged: (value) => Navigator.pop(context),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}