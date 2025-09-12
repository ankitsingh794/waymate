
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/notification_models.dart' as app_notification;
import 'package:timeago/timeago.dart' as timeago;

class NotificationListItem extends StatelessWidget {
  // --- UPDATED: Use the strongly-typed Notification model ---
  final app_notification.Notification notificationData;

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
    // --- UPDATED: Access data from the model ---
    final String type = notificationData.type;
    final String message = notificationData.message;
    final bool isRead = notificationData.read;
    // --- UPDATED: Use timeago for a user-friendly date ---
    final String timeAgo = timeago.format(notificationData.createdAt);

    return Container(
      color: isRead ? Colors.white : Colors.blue.shade50,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
          child: Icon(_getIconForType(type), color: Theme.of(context).primaryColor),
        ),
        title: Text(
          message,
          style: GoogleFonts.poppins(fontWeight: isRead ? FontWeight.normal : FontWeight.w600),
        ),
        subtitle: Text(
          timeAgo,
          style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600),
        ),
        onTap: () {
          // TODO: Navigate to the relevant context (e.g., the specific trip or chat)
          // Example:
          // if (notificationData.tripId != null) {
          //   Navigator.push(context, MaterialPageRoute(builder: (context) => TripDetailsScreen(tripId: notificationData.tripId!)));
          // }
        },
      ),
    );
  }
}