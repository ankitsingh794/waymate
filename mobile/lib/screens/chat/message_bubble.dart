// lib/widgets/message_bubble.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/message_model.dart';

class MessageBubble extends StatelessWidget {
  final Message message;
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
    final Color bubbleColor = isCurrentUser ? Theme.of(context).primaryColor : Colors.grey.shade200;
    final Color textColor = isCurrentUser ? Colors.white : Colors.black87;
    final Alignment alignment = isCurrentUser ? Alignment.centerRight : Alignment.centerLeft;
    final String senderName = message.sender?.name ?? 'AI Assistant';

    return Align(
      alignment: alignment,
      child: Container(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        margin: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
        child: Column(
          crossAxisAlignment: isCurrentUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (showSenderName)
              Padding(
                padding: const EdgeInsets.only(left: 12.0, bottom: 4.0),
                child: Text(senderName, style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600)),
              ),
            Container(
              decoration: BoxDecoration(
                color: bubbleColor,
                borderRadius: BorderRadius.circular(16.0),
              ),
              // --- NEW: Conditionally display text or media ---
              child: _buildMessageContent(textColor),
            ),
          ],
        ),
      ),
    );
  }

  // --- NEW: Helper to build content based on message type ---
  Widget _buildMessageContent(Color textColor) {
    if (message.media?.type == 'image' && message.media?.url != null) {
      // Display Image
      return ClipRRect(
        borderRadius: BorderRadius.circular(16.0),
        child: Image.network(
          message.media!.url!,
          loadingBuilder: (context, child, progress) {
            return progress == null ? child : const CircularProgressIndicator();
          },
        ),
      );
    } else {
      // Display Text
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
        child: Text(
          message.text ?? '...',
          style: GoogleFonts.poppins(color: textColor, fontSize: 16),
        ),
      );
    }
  }
}