import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class HouseholdManagementScreen extends StatefulWidget {
  const HouseholdManagementScreen({super.key});

  @override
  State<HouseholdManagementScreen> createState() => _HouseholdManagementScreenState();
}

class _HouseholdManagementScreenState extends State<HouseholdManagementScreen> {
  // In a real app, you'd fetch the user's household status from your backend.
  // We'll use this boolean to simulate the two different states.
  bool _isInHousehold = false; 

  // Mock data for when a user is in a household
  final Map<String, dynamic> _householdData = {
    'householdName': 'The Singh Family',
    'members': [
      {'name': 'Ankit Singh', 'role': 'head', 'avatarUrl': 'https://i.pravatar.cc/150?u=ankit'},
      {'name': 'Priya Singh', 'role': 'member', 'avatarUrl': 'https://i.pravatar.cc/150?u=priya'},
    ]
  };

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
        title: Text('Manage Household', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _isInHousehold ? _buildHouseholdView() : _buildNoHouseholdView(),
    );
  }

  // --- UI for users NOT in a household ---
  Widget _buildNoHouseholdView() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(Icons.home_work_outlined, size: 80, color: Colors.grey.shade400),
          const SizedBox(height: 24),
          Text(
            'You are not in a household',
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Create a household to plan trips with family, or join an existing one with an invite code.',
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(fontSize: 15, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () {
              // TODO: Call createHousehold API
            },
            child: const Text('Create a New Household'),
          ),
          OutlinedButton(
            onPressed: () {
              // TODO: Call acceptHouseholdInvite API
            },
            child: const Text('Join with Invite Code'),
          ),
        ],
      ),
    );
  }

  // --- UI for users who ARE in a household ---
  Widget _buildHouseholdView() {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        Text(
          _householdData['householdName'],
          style: GoogleFonts.poppins(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 24),
        Text('Members', style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w600)),
        const Divider(),
        ...(_householdData['members'] as List).map((member) {
          return ListTile(
            leading: CircleAvatar(backgroundImage: NetworkImage(member['avatarUrl'])),
            title: Text(member['name']),
            subtitle: Text(member['role']),
            // In a real app, you would show this menu only if the current user is the 'head'
            trailing: PopupMenuButton<String>(
              itemBuilder: (context) => [
                const PopupMenuItem(value: 'remove', child: Text('Remove')),
              ],
            ),
          );
        }).toList(),
        const Divider(),
        const SizedBox(height: 32),
        ElevatedButton.icon(
          onPressed: () {
            // TODO: Call generateInviteLink API
          },
          icon: const Icon(Icons.person_add_alt_1_outlined),
          label: const Text('Generate Invite Link'),
        ),
        TextButton(
          onPressed: () {
            // TODO: Call leaveHousehold or deleteHousehold API
          },
          style: TextButton.styleFrom(foregroundColor: Colors.red.shade700),
          child: const Text('Leave Household'),
        ),
      ],
    );
  }
}