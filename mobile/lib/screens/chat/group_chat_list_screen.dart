// lib/screens/chat/group_chat_list_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/chat_session_model.dart';
import 'package:mobile/screens/chat/group_chat_screen.dart';
import 'package:mobile/services/chat_service.dart';

class GroupChatListScreen extends StatefulWidget {
  const GroupChatListScreen({super.key});

  @override
  State<GroupChatListScreen> createState() => _GroupChatListScreenState();
}

class _GroupChatListScreenState extends State<GroupChatListScreen> {
  final ChatService _chatService = ChatService();
  late Future<List<ChatSession>> _sessionsFuture;

  @override
  void initState() {
    super.initState();
    _sessionsFuture = _chatService.getGroupSessions();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('My Trip Chats', style: GoogleFonts.poppins()),
      ),
      body: FutureBuilder<List<ChatSession>>(
        future: _sessionsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          final sessions = snapshot.data ?? [];
          if (sessions.isEmpty) {
            return const Center(child: Text('You have no group chats.'));
          }
          return ListView.builder(
            itemCount: sessions.length,
            itemBuilder: (context, index) {
              final session = sessions[index];
              return ListTile(
                leading: CircleAvatar(
                  backgroundImage: (session.tripId?.coverImage != null)
                      ? NetworkImage(session.tripId!.coverImage!)
                      : null,
                  child: (session.tripId?.coverImage == null)
                      ? const Icon(Icons.group)
                      : null,
                ),
                title: Text(
                  session.tripId?.destination ?? 'Group Chat',
                  style: GoogleFonts.poppins(fontWeight: FontWeight.bold),
                ),
                subtitle: Text(
                  session.lastMessage?.text ?? 'No messages yet.',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: session.lastMessage?.sentAt != null
                    ? Text(DateFormat.jm().format(session.lastMessage!.sentAt!))
                    : null,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => GroupChatScreen(session: session),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
