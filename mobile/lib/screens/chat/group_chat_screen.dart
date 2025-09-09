// lib/screens/chat/group_chat_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/screens/chat/message_bubble.dart';
import 'package:uuid/uuid.dart';

class GroupChatScreen extends StatefulWidget {
  final String tripName;
  const GroupChatScreen({super.key, required this.tripName});

  @override
  State<GroupChatScreen> createState() => _GroupChatScreenState();
}

class _GroupChatScreenState extends State<GroupChatScreen> {
  final TextEditingController _textController = TextEditingController();
  // Mock data for a group conversation
  final List<Map<String, dynamic>> _messages = [
    {'id': '1', 'sender': {'_id': 'user_sarah', 'name': 'Sarah'}, 'text': 'Can\'t wait for this trip! 🎉'},
    {'id': '2', 'sender': {'_id': 'user_john', 'name': 'John'}, 'text': 'Me too! Did everyone pack their sunscreen?'},
    {'id': '3', 'sender': {'_id': 'user_ankit', 'name': 'Ankit'}, 'text': 'Just did! I also grabbed the museum tickets for Day 2.'},
    {'id': '4', 'sender': {'_id': 'user_john', 'name': 'John'}, 'text': 'Awesome, you rock!'},
  ];
  final String _currentUserId = 'user_ankit'; // This would be the actual logged-in user's ID

  void _handleSubmitted(String text) {
    if (text.trim().isEmpty) return;
    _textController.clear();
    setState(() {
      _messages.add({
        'id': const Uuid().v4(),
        'sender': {'_id': _currentUserId, 'name': 'Ankit'},
        'text': text,
      });
    });
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
        title: Text(widget.tripName, style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold)),
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.of(context).pop()),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(8.0),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                final bool isCurrentUser = message['sender']['_id'] == _currentUserId;
                // Show sender's name if the previous message was from a different sender
                final bool showSenderName = !isCurrentUser && (index == 0 || _messages[index - 1]['sender']['_id'] != message['sender']['_id']);
                return MessageBubble(
                  message: message,
                  isCurrentUser: isCurrentUser,
                  showSenderName: showSenderName,
                );
              },
            ),
          ),
          _buildMessageComposer(),
        ],
      ),
    );
  }

  Widget _buildMessageComposer() {
    return Container(
      margin: const EdgeInsets.all(8.0),
      padding: const EdgeInsets.symmetric(horizontal: 8.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(30),
        boxShadow: [BoxShadow(color: Colors.grey.withOpacity(0.3), spreadRadius: 1, blurRadius: 5)],
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _textController,
              onSubmitted: _handleSubmitted,
              decoration: InputDecoration(
                hintText: 'Send a message...',
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12.0),
              ),
            ),
          ),
          IconButton(
            icon: Icon(Icons.send, color: Theme.of(context).primaryColor),
            onPressed: () => _handleSubmitted(_textController.text),
          ),
        ],
      ),
    );
  }
}