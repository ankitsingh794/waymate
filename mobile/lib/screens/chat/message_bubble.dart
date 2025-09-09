// lib/screens/chat/message_bubble.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class MessageBubble extends StatelessWidget {
  final Map<String, dynamic> message;
  final bool isCurrentUser;
  final bool showSenderName;

  const MessageBubble({
    super.key,
    required this.message,
    required this.isCurrentUser,
    required this.showSenderName,
  });

  @override
  Widget build(BuildContext context) {
    final Color bubbleColor = isCurrentUser
        ? const Color.fromARGB(255, 14, 59, 76) // Dark blue for the current user
        : Colors.grey.shade200; // Light grey for others
    final Color textColor = isCurrentUser ? Colors.white : Colors.black87;
    final Alignment alignment = isCurrentUser ? Alignment.centerRight : Alignment.centerLeft;
    final String senderName = message['sender']?['name'] ?? 'Unknown';

    return Align(
      alignment: alignment,
      child: Container(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        margin: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
        child: Column(
          crossAxisAlignment: isCurrentUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            // Conditionally show the sender's name
            if (showSenderName)
              Padding(
                padding: const EdgeInsets.only(left: 12.0, bottom: 4.0),
                child: Text(
                  senderName,
                  style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600),
                ),
              ),
            // The message bubble itself
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
              decoration: BoxDecoration(
                color: bubbleColor,
                borderRadius: BorderRadius.circular(16.0),
              ),
              child: Text(
                message['text'],
                style: GoogleFonts.poppins(color: textColor, fontSize: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}