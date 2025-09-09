// lib/widgets/notifications/notification_list_item.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class NotificationListItem extends StatelessWidget {
  final Map<String, dynamic> notificationData;

  const NotificationListItem({super.key, required this.notificationData});

  // Helper to get an icon based on notification type
  IconData _getIconForType(String type) {
    switch (type) {
      case 'chat':
        return Icons.chat_bubble_outline;
      case 'expense':
        return Icons.receipt_long_outlined;
      case 'itinerary':
        return Icons.list_alt_outlined;
      case 'alert':
        return Icons.warning_amber_rounded;
      default:
        return Icons.notifications_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final String type = notificationData['type'];
    final String message = notificationData['message'];
    final String timeAgo = notificationData['timeAgo'];
    final bool isRead = notificationData['isRead'];

    return Container(
      color: isRead ? Colors.white : Colors.blue.shade50,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
          child: Icon(
            _getIconForType(type),
            color: Theme.of(context).primaryColor,
          ),
        ),
        title: Text(
          message,
          style: GoogleFonts.poppins(
            fontWeight: isRead ? FontWeight.normal : FontWeight.w600,
          ),
        ),
        subtitle: Text(
          timeAgo,
          style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600),
        ),
        onTap: () {
          // TODO: Navigate to the relevant context (e.g., the specific chat or expense)
        },
      ),
    );
  }
}