// lib/widgets/profile/household_section.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/user_model.dart';

class HouseholdSection extends StatelessWidget {
  final User user;
  final String? householdSize;
  final String? householdType;
  final bool isHouseholdHead;
  final ValueChanged<String?> onHouseholdSizeChanged;
  final ValueChanged<String?> onHouseholdTypeChanged;
  final ValueChanged<bool> onHouseholdHeadChanged;

  const HouseholdSection({
    super.key,
    required this.user,
    this.householdSize,
    this.householdType,
    required this.isHouseholdHead,
    required this.onHouseholdSizeChanged,
    required this.onHouseholdTypeChanged,
    required this.onHouseholdHeadChanged,
  });

  @override
  Widget build(BuildContext context) {
    final hasHousehold = user.householdId != null;
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Household Management',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Manage your household information and family members',
            style: GoogleFonts.poppins(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Household Status Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: hasHousehold ? Colors.green[50] : Colors.orange[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: hasHousehold ? Colors.green[200]! : Colors.orange[200]!,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  hasHousehold ? Icons.home : Icons.home_outlined,
                  color: hasHousehold ? Colors.green[600] : Colors.orange[600],
                  size: 24,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        hasHousehold ? 'Household Member' : 'No Household',
                        style: GoogleFonts.poppins(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: hasHousehold ? Colors.green[800] : Colors.orange[800],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        hasHousehold 
                            ? 'You are part of household: ${user.householdId}'
                            : 'Create or join a household to share travel plans',
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          color: hasHousehold ? Colors.green[700] : Colors.orange[700],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          if (!hasHousehold) ...[
            // Create/Join Household Section
            Text(
              'Household Setup',
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
                      contentPadding: EdgeInsets.zero,
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.blue[50],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(Icons.add_home, color: Colors.blue[600]),
                      ),
                      title: Text(
                        'Create New Household',
                        style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        'Start a new household and invite family members',
                        style: GoogleFonts.poppins(fontSize: 12),
                      ),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                      onTap: () => _showCreateHouseholdDialog(context),
                    ),
                    const Divider(),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.green[50],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(Icons.group_add, color: Colors.green[600]),
                      ),
                      title: Text(
                        'Join Existing Household',
                        style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        'Enter invitation code to join a household',
                        style: GoogleFonts.poppins(fontSize: 12),
                      ),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                      onTap: () => _showJoinHouseholdDialog(context),
                    ),
                  ],
                ),
              ),
            ),
          ] else ...[
            // Household Information Section
            Text(
              'Household Information',
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
                    // Household Size
                    DropdownButtonFormField<String>(
                      initialValue: householdSize,
                      decoration: InputDecoration(
                        labelText: 'Household Size',
                        prefixIcon: const Icon(Icons.people),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        filled: true,
                        fillColor: Colors.grey[50],
                      ),
                      items: const [
                        DropdownMenuItem(value: '1', child: Text('1 person')),
                        DropdownMenuItem(value: '2', child: Text('2 people')),
                        DropdownMenuItem(value: '3', child: Text('3 people')),
                        DropdownMenuItem(value: '4', child: Text('4 people')),
                        DropdownMenuItem(value: '5', child: Text('5 people')),
                        DropdownMenuItem(value: '6+', child: Text('6+ people')),
                      ],
                      onChanged: onHouseholdSizeChanged,
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Household Type
                    DropdownButtonFormField<String>(
                      initialValue: householdType,
                      decoration: InputDecoration(
                        labelText: 'Household Type',
                        prefixIcon: const Icon(Icons.home_work),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        filled: true,
                        fillColor: Colors.grey[50],
                      ),
                      items: const [
                        DropdownMenuItem(value: 'family', child: Text('Family')),
                        DropdownMenuItem(value: 'couple', child: Text('Couple')),
                        DropdownMenuItem(value: 'roommates', child: Text('Roommates')),
                        DropdownMenuItem(value: 'single', child: Text('Single Person')),
                        DropdownMenuItem(value: 'other', child: Text('Other')),
                      ],
                      onChanged: onHouseholdTypeChanged,
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Household Head Toggle
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        'Household Head',
                        style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
                      ),
                      subtitle: Text(
                        'Primary decision maker for household travel plans',
                        style: GoogleFonts.poppins(fontSize: 12),
                      ),
                      value: isHouseholdHead,
                      onChanged: onHouseholdHeadChanged,
                      activeThumbColor: const Color.fromARGB(255, 87, 184, 203),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Household Members Section
            Text(
              'Household Members',
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
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundImage: user.profileImage != null 
                            ? NetworkImage(user.profileImage!)
                            : null,
                        child: user.profileImage == null 
                            ? const Icon(Icons.person)
                            : null,
                      ),
                      title: Text(
                        user.name,
                        style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        'You ${isHouseholdHead ? "(Head)" : "(Member)"}',
                        style: GoogleFonts.poppins(fontSize: 12),
                      ),
                      trailing: Icon(
                        Icons.verified,
                        color: Colors.green[600],
                        size: 20,
                      ),
                    ),
                    const Divider(),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.group_add),
                      title: Text(
                        'Invite Members',
                        style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
                      ),
                      subtitle: Text(
                        'Add family members to your household',
                        style: GoogleFonts.poppins(fontSize: 12),
                      ),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                      onTap: () => _showInviteMembersDialog(context),
                    ),
                    const Divider(),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.settings),
                      title: Text(
                        'Household Settings',
                        style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
                      ),
                      subtitle: Text(
                        'Manage household preferences and permissions',
                        style: GoogleFonts.poppins(fontSize: 12),
                      ),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                      onTap: () => _showHouseholdSettings(context),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Leave Household Button
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                onPressed: () => _showLeaveHouseholdDialog(context),
                icon: const Icon(Icons.exit_to_app),
                label: Text(
                  'Leave Household',
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red[600],
                  side: BorderSide(color: Colors.red[600]!),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
          
          const SizedBox(height: 24),
          
          // Benefits Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.purple[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.purple[200]!),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.star, color: Colors.purple[600]),
                    const SizedBox(width: 8),
                    Text(
                      'Household Benefits',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.purple[800],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const _BenefitItem(
                  icon: Icons.calendar_today,
                  text: 'Shared travel calendars and planning',
                ),
                const _BenefitItem(
                  icon: Icons.location_on,
                  text: 'Coordinated location sharing',
                ),
                const _BenefitItem(
                  icon: Icons.notifications,
                  text: 'Family safety notifications',
                ),
                const _BenefitItem(
                  icon: Icons.savings,
                  text: 'Group travel discounts and offers',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showCreateHouseholdDialog(BuildContext context) {
    final nameController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create New Household'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(
                labelText: 'Household Name',
                hintText: 'e.g., The Smith Family',
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'You will be the household head and can invite other members.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
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
                  content: Text('Household created successfully!'),
                  backgroundColor: Colors.green,
                ),
              );
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  void _showJoinHouseholdDialog(BuildContext context) {
    final codeController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Join Household'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: codeController,
              decoration: const InputDecoration(
                labelText: 'Invitation Code',
                hintText: 'Enter 6-digit code',
              ),
              maxLength: 6,
            ),
            const SizedBox(height: 8),
            const Text(
              'Ask a household member for the invitation code.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
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
                  content: Text('Joined household successfully!'),
                  backgroundColor: Colors.green,
                ),
              );
            },
            child: const Text('Join'),
          ),
        ],
      ),
    );
  }

  void _showInviteMembersDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Invite Members'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Your household invitation code:'),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'ABC123',
                style: GoogleFonts.poppins(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Share this code with family members to invite them.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // Share invitation code
            },
            child: const Text('Share Code'),
          ),
        ],
      ),
    );
  }

  void _showHouseholdSettings(BuildContext context) {
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Household settings would open here'),
      ),
    );
  }

  void _showLeaveHouseholdDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          'Leave Household',
          style: TextStyle(color: Colors.red[600]),
        ),
        content: const Text(
          'Are you sure you want to leave this household? You will lose access to shared plans and calendars.',
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
                  content: Text('Left household successfully'),
                  backgroundColor: Colors.orange,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Leave'),
          ),
        ],
      ),
    );
  }
}

class _BenefitItem extends StatelessWidget {
  final IconData icon;
  final String text;

  const _BenefitItem({
    required this.icon,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.purple[600]),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.poppins(
                fontSize: 12,
                color: Colors.purple[700],
              ),
            ),
          ),
        ],
      ),
    );
  }
}