import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/trip_models.dart';
import 'package:mobile/models/user_model.dart';
import 'package:mobile/services/trip_service.dart';
import 'package:mobile/services/user_service.dart';
import 'package:intl/intl.dart';

class ManageMembersScreen extends StatefulWidget {
  final Trip trip;
  const ManageMembersScreen({super.key, required this.trip});

  @override
  State<ManageMembersScreen> createState() => _ManageMembersScreenState();
}

class _ManageMembersScreenState extends State<ManageMembersScreen> {
  final TripService _tripService = TripService();
  // --- UPDATED: Instantiate the real UserService ---
  final UserService _userService = UserService();

  // --- UPDATED: The user is now fetched via a Future ---
  late Future<User> _currentUserFuture;
  late List<Member> _members;
  late String _tripId;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _tripId = widget.trip.id;
    _members = List<Member>.from(widget.trip.group?.members ?? []);
    _currentUserFuture = _userService.getUserProfile();
  }

  // --- API INTEGRATION: Generates an invite token ---
  Future<void> _generateInviteToken() async {
    try {
      final inviteData = await _tripService.generateInviteToken(_tripId);
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Share Invite Token'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Share this token with people you want to invite:'),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: SelectableText(
                  inviteData['token'],
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Expires: ${DateFormat('MMM dd, yyyy HH:mm').format(DateTime.parse(inviteData['expiresAt']))}',
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'They can use this token in the "Join Trip" section of the app.',
                style: TextStyle(fontSize: 12),
              ),
            ],
          ),
          actions: [
            TextButton(
              child: const Text('Copy Token'),
              onPressed: () {
                Clipboard.setData(ClipboardData(text: inviteData['token']));
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Token copied to clipboard!')),
                );
              },
            ),
            TextButton(
              child: const Text('Close'),
              onPressed: () => Navigator.of(ctx).pop(),
            ),
          ],
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to generate token: $e')),
      );
    }
  }

  // --- API INTEGRATION: Removes a member from the trip ---
  Future<void> _removeMember(Member memberToRemove) async {
    setState(() => _isLoading = true);
    try {
      await _tripService.removeMemberFromTrip(_tripId, memberToRemove.user.id);
      setState(() {
        _members.removeWhere((m) => m.user.id == memberToRemove.user.id);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('${memberToRemove.user.name} has been removed.')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to remove member: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // --- API INTEGRATION: Updates a member's role ---
  Future<void> _updateMemberRole(Member member, String newRole) async {
    setState(() => _isLoading = true);
    try {
      await _tripService.updateMemberRole(_tripId, member.user.id, newRole);
      setState(() {
        final index = _members.indexWhere((m) => m.user.id == member.user.id);
        if (index != -1) {
          _members[index] = Member(
              user: member.user, role: newRole, relation: member.relation);
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text("${member.user.name}'s role updated to $newRole.")),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update role: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // --- API INTEGRATION for updating the current user's relationship tag ---
  Future<void> _updateMyRelationship(
      String newRelationship, String currentUserId) async {
    setState(() => _isLoading = true);
    try {
      await _tripService
          .updateMyMemberDetails(_tripId, {'relation': newRelationship});
      setState(() {
        final index = _members.indexWhere((m) => m.user.id == currentUserId);
        if (index != -1) {
          final member = _members[index];
          _members[index] = Member(
              user: member.user, role: member.role, relation: newRelationship);
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Your relationship has been updated.")),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update relationship: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // --- DIALOGS FOR USER ACTIONS ---

  void _showRemoveConfirmationDialog(Member member) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove Member'),
        content: Text(
            'Are you sure you want to remove ${member.user.name} from the trip?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.of(ctx).pop();
              _removeMember(member);
            },
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }

  void _showChangeRoleDialog(Member member) {
    String currentRole = member.role;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Change Role for ${member.user.name}'),
        content: StatefulBuilder(builder: (context, setDialogState) {
          return Column(mainAxisSize: MainAxisSize.min, children: [
            RadioListTile<String>(
              title: const Text('Editor'),
              value: 'editor',
              groupValue: currentRole,
              onChanged: (value) => setDialogState(() => currentRole = value!),
            ),
            RadioListTile<String>(
              title: const Text('Viewer'),
              value: 'viewer',
              groupValue: currentRole,
              onChanged: (value) => setDialogState(() => currentRole = value!),
            ),
          ]);
        }),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _updateMemberRole(member, currentRole);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showSetRelationshipDialog(Member member, String currentUserId) {
    const relationships = ['Family', 'Friend', 'Coworker', 'Partner', 'Other'];
    String? selectedRelationship = member.relation;

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Set Your Relationship'),
          content: DropdownButtonFormField<String>(
            initialValue: selectedRelationship,
            hint: const Text('Select a relationship'),
            items: relationships.map((String value) {
              return DropdownMenuItem<String>(value: value, child: Text(value));
            }).toList(),
            onChanged: (newValue) => selectedRelationship = newValue,
          ),
          actions: <Widget>[
            TextButton(
              child: const Text('Cancel'),
              onPressed: () => Navigator.of(context).pop(),
            ),
            ElevatedButton(
              child: const Text('Save'),
              onPressed: () {
                if (selectedRelationship != null) {
                  Navigator.of(context).pop();
                  _updateMyRelationship(selectedRelationship!, currentUserId);
                }
              },
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // --- UPDATED: Using FutureBuilder to handle loading the current user ---
    return FutureBuilder<User>(
      future: _currentUserFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Scaffold(
              appBar: AppBar(),
              body: const Center(child: CircularProgressIndicator()));
        }

        if (snapshot.hasError) {
          return Scaffold(
              appBar: AppBar(),
              body: Center(child: Text('Error: ${snapshot.error}')));
        }

        if (!snapshot.hasData) {
          return Scaffold(
              appBar: AppBar(),
              body: const Center(child: Text('Could not load user profile.')));
        }

        final currentUser = snapshot.data!;
        final owner = _members.firstWhere((m) => m.role == 'owner',
            orElse: () => _members.first);
        final isCurrentUserOwner = owner.user.id == currentUser.id;

        return Scaffold(
          appBar: AppBar(
            title: Text('Manage Members',
                style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
          ),
          floatingActionButton: (isCurrentUserOwner || owner.role == 'editor')
              ? FloatingActionButton.extended(
                  onPressed: _generateInviteToken,
                  label: const Text('Invite'),
                  icon: const Icon(Icons.person_add_alt_1),
                )
              : null,
          body: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : ListView.separated(
                  itemCount: _members.length,
                  separatorBuilder: (context, index) =>
                      const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final member = _members[index];
                    final bool isThisMemberTheOwner = member.role == 'owner';
                    final bool isThisMemberCurrentUser =
                        member.user.id == currentUser.id;
                    final bool canCurrentUserEditThisMember =
                        isCurrentUserOwner && !isThisMemberCurrentUser;

                    return ListTile(
                      leading: CircleAvatar(
                        backgroundImage: NetworkImage(
                            member.user.profileImage ??
                                'https://i.pravatar.cc/150'),
                      ),
                      title: Text(
                        '${member.user.name}${isThisMemberCurrentUser ? " (You)" : ""}',
                        style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        '${member.role.capitalize()}${member.relation != null ? " (${member.relation})" : ""}',
                        style: GoogleFonts.poppins(color: Colors.grey.shade600),
                      ),
                      trailing: _buildTrailingWidget(
                        canCurrentUserEditThisMember,
                        isThisMemberCurrentUser,
                        isThisMemberTheOwner,
                        member,
                        currentUser,
                      ),
                    );
                  },
                ),
        );
      },
    );
  }

  Widget? _buildTrailingWidget(
    bool canOwnerEdit,
    bool isCurrentUser,
    bool isOwner,
    Member member,
    User currentUser,
  ) {
    if (canOwnerEdit) {
      return PopupMenuButton<String>(
        onSelected: (value) {
          if (value == 'change_role') _showChangeRoleDialog(member);
          if (value == 'remove') _showRemoveConfirmationDialog(member);
        },
        itemBuilder: (context) => [
          const PopupMenuItem(value: 'change_role', child: Text('Change Role')),
          const PopupMenuItem(
              value: 'remove',
              child: Text('Remove from Trip',
                  style: TextStyle(color: Colors.red))),
        ],
      );
    } else if (isCurrentUser && !isOwner) {
      return TextButton(
        child: const Text('Edit'),
        onPressed: () => _showSetRelationshipDialog(member, currentUser.id),
      );
    }
    return null;
  }
}

extension StringExtension on String {
  String capitalize() {
    return "${this[0].toUpperCase()}${substring(1).toLowerCase()}";
  }
}
