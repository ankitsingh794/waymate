// lib/screens/trip_details/manage_members_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ManageMembersScreen extends StatefulWidget {
  final Map<String, dynamic> tripData;
  const ManageMembersScreen({super.key, required this.tripData});

  @override
  State<ManageMembersScreen> createState() => _ManageMembersScreenState();
}

class _ManageMembersScreenState extends State<ManageMembersScreen> {
  late List<Map<String, dynamic>> _members;
  // In a real app, this would come from the logged-in user's data
  final String _currentUserId = "ankit_id_placeholder";

  @override
  void initState() {
    super.initState();
    _members = List<Map<String, dynamic>>.from(
        widget.tripData['group']?['members'] ?? []);
  }

  void _showChangeRelationshipDialog(Map<String, dynamic> member) {
    // List of predefined relationship tags
    const relationships = ['Family', 'Friend', 'Coworker', 'Partner', 'Other'];
    String? selectedRelationship = member['relation'];

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Set Relationship for ${member['name']}'),
          content: DropdownButton<String>(
            value: selectedRelationship,
            isExpanded: true,
            hint: const Text('Select a relationship'),
            items: relationships.map((String value) {
              return DropdownMenuItem<String>(
                value: value,
                child: Text(value),
              );
            }).toList(),
            onChanged: (newValue) {
              selectedRelationship = newValue;
              // This is for stateful dialogs if needed, but we handle it on save.
            },
          ),
          actions: <Widget>[
            TextButton(
              child: const Text('Cancel'),
              onPressed: () => Navigator.of(context).pop(),
            ),
            ElevatedButton(
              child: const Text('Save'),
              onPressed: () {
                // TODO: Call API to update the member's relationship tag
                // PATCH /api/trips/:tripId/members/me (if updating self)
                // or a new endpoint for owner updating others.
                setState(() {
                  member['relation'] = selectedRelationship;
                });
                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                      content: Text(
                          '${member['name']}\'s relationship set to ${selectedRelationship ?? ''}')),
                );
              },
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // --- FIX: Use the 'id' field for a more reliable check ---
    final String ownerId = _members.firstWhere(
          (m) => m['role'] == 'owner',
          orElse: () => {},
        )['id'] ??
        ''; // Assuming each member map has an 'id' key

    // --- FIX: Compare the owner's ID with the current user's ID ---
    final bool isCurrentUserOwner = ownerId == _currentUserId;

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
        title: Text('Manage Members',
            style: GoogleFonts.poppins(
                color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: ListView.separated(
        itemCount: _members.length,
        separatorBuilder: (context, index) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final member = _members[index];
          final String memberName = member['name'] ?? 'Unknown';
          final String memberRole = member['role'] ?? 'viewer';
          final String memberRelation =
              member['relation'] != null ? '(${member['relation']})' : '';
          final bool isThisMemberTheOwner = memberRole == 'owner';
          // Using a more descriptive name for the check inside the list item
          final bool canCurrentUserEdit =
              isCurrentUserOwner && !isThisMemberTheOwner;

          return ListTile(
            leading: CircleAvatar(
              backgroundImage: NetworkImage(member['avatarUrl']),
            ),
            title: Text(memberName,
                style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
            subtitle: Text('$memberRole $memberRelation',
                style: GoogleFonts.poppins(color: Colors.grey.shade600)),
            trailing: canCurrentUserEdit
                ? PopupMenuButton<String>(
                    onSelected: (value) {
                      if (value == 'change_role') {
                        // TODO: Show dialog to change role
                      } else if (value == 'change_relationship') {
                        _showChangeRelationshipDialog(member);
                      } else if (value == 'remove') {
                        // TODO: Show confirmation dialog to remove user
                      }
                    },
                    itemBuilder: (BuildContext context) =>
                        <PopupMenuEntry<String>>[
                      const PopupMenuItem<String>(
                          value: 'change_role', child: Text('Change Role')),
                      const PopupMenuItem<String>(
                          value: 'change_relationship',
                          child: Text('Set Relationship')),
                      const PopupMenuItem<String>(
                          value: 'remove',
                          child: Text('Remove from Trip',
                              style: TextStyle(color: Colors.red))),
                    ],
                  )
                : null,
          );
        },
      ),
    );
  }
}
