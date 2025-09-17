// lib/widgets/profile/consent_section.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ConsentSection extends StatelessWidget {
  final Map<String, bool> consents;
  final Function(String, bool) onConsentChanged;
  final VoidCallback onSave;

  const ConsentSection({
    super.key,
    required this.consents,
    required this.onConsentChanged,
    required this.onSave,
  });

  static const Map<String, Map<String, String>> consentDetails = {
    'data_collection': {
      'title': 'Data Collection',
      'description': 'Allow collection of your travel data to improve recommendations and app functionality.',
      'icon': 'data_usage',
    },
    'demographic_data': {
      'title': 'Demographic Information',
      'description': 'Share demographic information for personalized services and research purposes.',
      'icon': 'person_outline',
    },
    'passive_tracking': {
      'title': 'Location Tracking',
      'description': 'Enable background location tracking to automatically detect trips and provide real-time suggestions.',
      'icon': 'location_on',
    },
    'marketing_communications': {
      'title': 'Marketing Communications',
      'description': 'Receive promotional emails, newsletters, and updates about new features.',
      'icon': 'email',
    },
    'research_participation': {
      'title': 'Research Participation',
      'description': 'Participate in research studies to help improve transportation systems and urban planning.',
      'icon': 'science',
    },
  };

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Privacy & Consent Management',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Control how your data is used and shared',
            style: GoogleFonts.poppins(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Privacy Overview Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue[200]!),
            ),
            child: Row(
              children: [
                Icon(Icons.shield, color: Colors.blue[600], size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Your Privacy Matters',
                        style: GoogleFonts.poppins(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.blue[800],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'You have full control over your data. You can change these settings anytime.',
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          color: Colors.blue[700],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Consent Cards
          ...consents.keys.map((consentType) {
            final details = consentDetails[consentType]!;
            final isEnabled = consents[consentType] ?? false;
            
            return Padding(
              padding: const EdgeInsets.only(bottom: 16.0),
              child: Card(
                elevation: isEnabled ? 2 : 1,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(
                    color: isEnabled 
                        ? const Color.fromARGB(255, 87, 184, 203)
                        : Colors.grey[300]!,
                    width: isEnabled ? 2 : 1,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            _getIconData(details['icon']!),
                            color: isEnabled 
                                ? const Color.fromARGB(255, 87, 184, 203)
                                : Colors.grey[600],
                            size: 24,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              details['title']!,
                              style: GoogleFonts.poppins(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: isEnabled ? Colors.grey[800] : Colors.grey[600],
                              ),
                            ),
                          ),
                          Switch(
                            value: isEnabled,
                            onChanged: (value) => onConsentChanged(consentType, value),
                            activeThumbColor: const Color.fromARGB(255, 87, 184, 203),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        details['description']!,
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          color: Colors.grey[600],
                          height: 1.4,
                        ),
                      ),
                      if (isEnabled) ...[
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.green[50],
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.green[200]!),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.check_circle, 
                                   color: Colors.green[600], size: 16),
                              const SizedBox(width: 8),
                              Text(
                                'Consent granted',
                                style: GoogleFonts.poppins(
                                  fontSize: 12,
                                  color: Colors.green[800],
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      if (consentType == 'data_collection' && isEnabled) ...[
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () => _showDataUsageDetails(context),
                          child: Text(
                            'View data usage details',
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              color: const Color.fromARGB(255, 87, 184, 203),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            );
          }),
          
          const SizedBox(height: 24),
          
          // Data Export Section
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.download, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'Data Rights',
                        style: GoogleFonts.poppins(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey[700],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.file_download, size: 20),
                    title: Text(
                      'Export My Data',
                      style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
                    ),
                    subtitle: Text(
                      'Download all your data in a portable format',
                      style: GoogleFonts.poppins(fontSize: 12),
                    ),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () => _requestDataExport(context),
                  ),
                  const Divider(),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.delete_forever, size: 20),
                    title: Text(
                      'Delete My Account',
                      style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w500,
                        color: Colors.red[600],
                      ),
                    ),
                    subtitle: Text(
                      'Permanently delete your account and all data',
                      style: GoogleFonts.poppins(fontSize: 12),
                    ),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () => _requestAccountDeletion(context),
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Save Consent Settings Button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: onSave,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color.fromARGB(255, 87, 184, 203),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 2,
              ),
              child: Text(
                'Save Privacy Preferences',
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Legal Links
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
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.article, size: 20),
                    title: Text(
                      'Privacy Policy',
                      style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
                    ),
                    trailing: const Icon(Icons.open_in_new, size: 16),
                    onTap: () {
                      // Open privacy policy
                    },
                  ),
                  const Divider(),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.gavel, size: 20),
                    title: Text(
                      'Terms of Service',
                      style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
                    ),
                    trailing: const Icon(Icons.open_in_new, size: 16),
                    onTap: () {
                      // Open terms of service
                    },
                  ),
                  const Divider(),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.cookie, size: 20),
                    title: Text(
                      'Cookie Policy',
                      style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
                    ),
                    trailing: const Icon(Icons.open_in_new, size: 16),
                    onTap: () {
                      // Open cookie policy
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  IconData _getIconData(String iconName) {
    switch (iconName) {
      case 'data_usage':
        return Icons.data_usage;
      case 'person_outline':
        return Icons.person_outline;
      case 'location_on':
        return Icons.location_on;
      case 'email':
        return Icons.email;
      case 'science':
        return Icons.science;
      default:
        return Icons.help_outline;
    }
  }

  void _showDataUsageDetails(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Data Usage Details',
                style: GoogleFonts.poppins(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  children: [
                    Text(
                      'The following data is collected when you consent to data collection:',
                      style: GoogleFonts.poppins(fontSize: 14),
                    ),
                    const SizedBox(height: 16),
                    const _DataUsageItem(
                      icon: Icons.location_on,
                      title: 'Location Data',
                      description: 'GPS coordinates, city, country for trip planning and recommendations',
                    ),
                    const _DataUsageItem(
                      icon: Icons.directions,
                      title: 'Travel Patterns',
                      description: 'Trip routes, modes of transport, travel times for analytics',
                    ),
                    const _DataUsageItem(
                      icon: Icons.device_hub,
                      title: 'Device Information',
                      description: 'Device type, OS version, app version for compatibility',
                    ),
                    const _DataUsageItem(
                      icon: Icons.analytics,
                      title: 'Usage Analytics',
                      description: 'App interactions, feature usage, crash reports for improvements',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _requestDataExport(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Export Your Data'),
        content: const Text(
          'We\'ll prepare your data export and send you a download link via email. This may take up to 24 hours.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Data export request submitted. Check your email in 24 hours.'),
                  backgroundColor: Colors.green,
                ),
              );
            },
            child: const Text('Request Export'),
          ),
        ],
      ),
    );
  }

  void _requestAccountDeletion(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          'Delete Account',
          style: TextStyle(color: Colors.red[600]),
        ),
        content: const Text(
          'This action cannot be undone. All your data, trips, and preferences will be permanently deleted.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // In a real app, this would require additional verification
              _showDeletionConfirmation(context);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete Account'),
          ),
        ],
      ),
    );
  }

  void _showDeletionConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Account Deletion Initiated'),
        content: const Text(
          'Your account deletion request has been submitted. You will receive a confirmation email with further instructions.',
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}

class _DataUsageItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _DataUsageItem({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
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
}