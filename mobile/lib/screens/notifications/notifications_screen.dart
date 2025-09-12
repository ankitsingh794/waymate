// lib/screens/notifications/notifications_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'; // --- NEW: Import Riverpod ---
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/widgets/notifications/notification_list_item.dart';
import 'package:mobile/models/notification_models.dart' as app_notification;
import 'package:mobile/providers.dart'; // --- NEW: Import the providers ---

// --- UPDATED: Changed from StatefulWidget to ConsumerStatefulWidget ---
class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

// --- UPDATED: Changed from State to ConsumerState ---
class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  // --- REMOVED: Do not create the service instance directly ---
  // final NotificationService _notificationService = NotificationService(context);

  @override
  void initState() {
    super.initState();
    // When the user opens this screen, mark all notifications as read.
    // --- UPDATED: Access the service via ref.read() in initState ---
    ref.read(notificationServiceProvider).markAllAsRead();
  }

  @override
  Widget build(BuildContext context) {
    // --- UPDATED: Access the service via ref.watch() in the build method ---
    final notificationService = ref.watch(notificationServiceProvider);

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
        title: Text('Notifications',
            style: GoogleFonts.poppins(
                color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: ValueListenableBuilder<List<app_notification.Notification>>(
        // --- UPDATED: Get the notifications ValueNotifier from the service instance ---
        valueListenable: notificationService.notifications,
        builder: (context, notifications, child) {
          if (notifications.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_off_outlined,
                      size: 60, color: Colors.grey.shade400),
                  const SizedBox(height: 16),
                  Text('No Notifications Yet',
                      style: GoogleFonts.poppins(
                          fontSize: 18, color: Colors.grey.shade600)),
                ],
              ),
            );
          }
          return ListView.separated(
            itemCount: notifications.length,
            separatorBuilder: (context, index) => const Divider(height: 1),
            itemBuilder: (context, index) {
              return NotificationListItem(
                  notificationData: notifications[index]);
            },
          );
        },
      ),
    );
  }
}
