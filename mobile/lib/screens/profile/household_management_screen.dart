// lib/screens/profile/household_management_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/household_models.dart';
import 'package:mobile/models/user_model.dart';
import 'package:mobile/services/api_client.dart';
import 'package:mobile/services/household_service.dart';
import 'package:mobile/services/user_service.dart';

class HouseholdManagementScreen extends StatefulWidget {
  const HouseholdManagementScreen({super.key});

  @override
  State<HouseholdManagementScreen> createState() =>
      _HouseholdManagementScreenState();
}

class _HouseholdManagementScreenState extends State<HouseholdManagementScreen> {
  final HouseholdService _householdService = HouseholdService();
  final UserService _userService = UserService();
  late Future<Household?> _householdFuture;
  late Future<User> _userFuture;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    _householdFuture = _householdService.getMyHouseholdDetails();
    _userFuture = _userService.getUserProfile();
  }

  void _reloadData() {
    setState(() {
      _loadData();
    });
  }

  // --- DIALOGS FOR ACTIONS ---

  void _showCreateHouseholdDialog() {
    final nameController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Create New Household'),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(labelText: 'Household Name'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.trim().isEmpty) return;
              Navigator.of(ctx).pop();
              try {
                await _householdService.createHousehold(nameController.text.trim());
                _reloadData();
              } on ApiException catch (e) {
                if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  void _showJoinHouseholdDialog() {
    final codeController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Join Household'),
        content: TextField(
          controller: codeController,
          decoration: const InputDecoration(labelText: 'Invite Code/Token'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (codeController.text.trim().isEmpty) return;
              Navigator.of(ctx).pop();
              try {
                await _householdService.acceptHouseholdInvite(codeController.text.trim());
                _reloadData();
              } on ApiException catch (e) {
                if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
              }
            },
            child: const Text('Join'),
          ),
        ],
      ),
    );
  }

  void _showInviteLinkDialog(String householdId) async {
    try {
      final link = await _householdService.generateInviteLink(householdId);
      if(!mounted) return;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Invite Link'),
          content: SelectableText(link),
          actions: [
            TextButton(
              onPressed: () {
                Clipboard.setData(ClipboardData(text: link));
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Link copied!')));
              },
              child: const Text('Copy'),
            )
          ],
        ),
      );
    } on ApiException catch (e) {
      if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  // --- NEW: Dialog to edit the household name ---
  void _showEditNameDialog(Household household) {
    final nameController = TextEditingController(text: household.householdName);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rename Household'),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(labelText: 'New Household Name'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.trim().isEmpty) return;
              Navigator.of(ctx).pop();
              try {
                await _householdService.updateHousehold(household.id, nameController.text.trim());
                _reloadData();
              } on ApiException catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  // --- NEW: Dialog to edit member details ---
  void _showEditMemberDialog(Household household, HouseholdMember member) {
    // In a real app, you might fetch these from a config or constants file
    const roles = ['member', 'editor', 'head'];
    String selectedRole = member.role;
    final relationshipController = TextEditingController(text: member.relationship);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Edit ${member.user.name}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<String>(
              initialValue: selectedRole,
              decoration: const InputDecoration(labelText: 'Role'),
              items: roles.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
              onChanged: (value) {
                if (value != null) selectedRole = value;
              },
            ),
            const SizedBox(height: 16),
            TextField(
              controller: relationshipController,
              decoration: const InputDecoration(labelText: 'Relationship'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              try {
                await _householdService.updateMemberDetails(
                  household.id,
                  member.user.id,
                  role: selectedRole,
                  relationship: relationshipController.text.trim(),
                );
                _reloadData();
              } on ApiException catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
              }
            },
            child: const Text('Save'),
          )
        ],
      ),
    );
  }
  
  // --- NEW: Dialog to submit household survey ---
  void _showSurveyDialog(Household household) {
    int selectedVehicleCount = household.surveyData?.vehicleOwnership ?? 0;
    // ... add controllers for other survey fields if needed
    
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Household Survey'),
        content: DropdownButtonFormField<int>(
          initialValue: selectedVehicleCount,
          decoration: const InputDecoration(labelText: 'Vehicles Owned'),
          items: [0, 1, 2, 3, 4, 5].map((v) => DropdownMenuItem(value: v, child: Text(v.toString()))).toList(),
          onChanged: (value) {
            if (value != null) selectedVehicleCount = value;
          },
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              try {
                final surveyData = SurveyData(vehicleOwnership: selectedVehicleCount);
                await _householdService.submitSurvey(household.id, surveyData);
                _reloadData();
              } on ApiException catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
              }
            },
            child: const Text('Submit'),
          )
        ],
      ),
    );
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
        title: Text('Manage Household', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: FutureBuilder(
        future: Future.wait([_householdFuture, _userFuture]),
        builder: (context, AsyncSnapshot<List<dynamic>> snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }

          final Household? household = snapshot.data?[0];
          final User currentUser = snapshot.data?[1];

          return household != null
              ? _buildHouseholdView(household, currentUser)
              : _buildNoHouseholdView();
        },
      ),
    );
  }

  Widget _buildNoHouseholdView() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(Icons.home_work_outlined, size: 80, color: Colors.grey.shade400),
          const SizedBox(height: 24),
          Text('You are not in a household', textAlign: TextAlign.center, style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text('Create a household to plan trips with family, or join an existing one with an invite code.', textAlign: TextAlign.center, style: GoogleFonts.poppins(fontSize: 15, color: Colors.grey.shade600)),
          const SizedBox(height: 32),
          ElevatedButton(onPressed: _showCreateHouseholdDialog, child: const Text('Create a New Household')),
          OutlinedButton(onPressed: _showJoinHouseholdDialog, child: const Text('Join with Invite Code')),
        ],
      ),
    );
  }

  Widget _buildHouseholdView(Household household, User currentUser) {
    final bool isCurrentUserHead = household.members.any((m) => m.user.id == currentUser.id && m.role == 'head');

    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        Row(
          children: [
            Expanded(child: Text(household.householdName, style: GoogleFonts.poppins(fontSize: 24, fontWeight: FontWeight.bold))),
            // --- NEW: Edit name button for head ---
            if (isCurrentUserHead)
              IconButton(icon: const Icon(Icons.edit_outlined), onPressed: () => _showEditNameDialog(household)),
          ],
        ),
        const SizedBox(height: 24),

        // --- NEW: Household Survey Section ---
        Card(
          child: ListTile(
            leading: const Icon(Icons.poll_outlined),
            title: const Text('Household Survey'),
            subtitle: Text(household.surveyData != null ? 'Last updated: ${DateFormat.yMMMd().format(household.surveyData!.lastUpdated!)}' : 'Not yet submitted'),
            trailing: const Icon(Icons.chevron_right),
            onTap: isCurrentUserHead ? () => _showSurveyDialog(household) : null,
          ),
        ),
        const SizedBox(height: 24),

        Text('Members', style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w600)),
        const Divider(),
        ...household.members.map((member) {
          final bool isThisMemberCurrentUser = member.user.id == currentUser.id;
          return ListTile(
            leading: CircleAvatar(backgroundImage: NetworkImage(member.user.profileImage ?? 'https://i.pravatar.cc/150?u=${member.user.id}')),
            title: Text('${member.user.name}${isThisMemberCurrentUser ? " (You)" : ""}'),
            subtitle: Text('${member.role} - ${member.relationship}'),
            trailing: (isCurrentUserHead && !isThisMemberCurrentUser)
                ? PopupMenuButton<String>(
                    onSelected: (value) async {
                      if (value == 'edit') _showEditMemberDialog(household, member);
                      if (value == 'remove') {
                        try {
                          await _householdService.removeMember(household.id, member.user.id);
                          _reloadData();
                        } on ApiException catch (e) {
                          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
                        }
                      }
                    },
                    itemBuilder: (context) => [
                      // --- NEW: Edit member option ---
                      const PopupMenuItem(value: 'edit', child: Text('Edit Member')),
                      const PopupMenuItem(value: 'remove', child: Text('Remove')),
                    ],
                  )
                : null,
          );
        }),
        const Divider(),
        const SizedBox(height: 32),
        if (isCurrentUserHead)
          ElevatedButton.icon(
            onPressed: () => _showInviteLinkDialog(household.id),
            icon: const Icon(Icons.person_add_alt_1_outlined),
            label: const Text('Generate Invite Link'),
          ),
        TextButton(
          onPressed: () async {
            try {
              if (isCurrentUserHead) {
                await _householdService.deleteHousehold(household.id);
              } else {
                // --- CORRECTED: Use the leaveHousehold method ---
                await _householdService.leaveHousehold(household.id);
              }
              _reloadData();
            } on ApiException catch (e) {
              if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
            }
          },
          style: TextButton.styleFrom(foregroundColor: Colors.red.shade700),
          child: Text(isCurrentUserHead ? 'Delete Household' : 'Leave Household'),
        ),
      ],
    );
  }
}