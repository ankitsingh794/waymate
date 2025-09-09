// lib/screens/notifications/notifications_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/widgets/notifications/notification_list_item.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  // In a real app, this data would come from a real-time stream (Socket.IO)
  final List<Map<String, dynamic>> _notifications = const [
    {
      'type': 'expense',
      'message': 'Sarah added a new expense "Team Dinner" to your trip to Rome.',
      'timeAgo': '15m ago',
      'isRead': false,
    },
    {
      'type': 'chat',
      'message': 'John sent a new message in the "Trip to Rome" chat.',
      'timeAgo': '1h ago',
      'isRead': false,
    },
    {
      'type': 'itinerary',
      'message': 'The itinerary for Day 3 of your trip to Kyoto has been updated.',
      'timeAgo': '1d ago',
      'isRead': true,
    },
    {
      'type': 'alert',
      'message': 'Weather Alert: Heavy rain expected in Rome tomorrow.',
      'timeAgo': '2d ago',
      'isRead': true,
    },
  ];

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
        title: Text('Notifications', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _notifications.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_off_outlined, size: 60, color: Colors.grey.shade400),
                  const SizedBox(height: 16),
                  Text(
                    'No Notifications Yet',
                    style: GoogleFonts.poppins(fontSize: 18, color: Colors.grey.shade600),
                  ),
                ],
              ),
            )
          : ListView.separated(
              itemCount: _notifications.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                return NotificationListItem(notificationData: _notifications[index]);
              },
            ),
    );
  }
}