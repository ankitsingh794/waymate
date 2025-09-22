import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/providers.dart';

/// Example screen showing how to use the comprehensive notification system
class NotificationDemoScreen extends ConsumerStatefulWidget {
  const NotificationDemoScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<NotificationDemoScreen> createState() =>
      _NotificationDemoScreenState();
}

class _NotificationDemoScreenState
    extends ConsumerState<NotificationDemoScreen> {
  List<String> _notifications = [];

  @override
  void initState() {
    super.initState();
    _setupNotificationListeners();
  }

  void _setupNotificationListeners() {
    final notificationHandler = ref.read(notificationHandlerProvider);

    // Initialize the notification handler
    notificationHandler.initialize();

    // Listen to all notification types
    notificationHandler.onGeneralNotification.listen((notification) {
      _addNotification('📧 General: ${notification.message}');
    });

    notificationHandler.onTripNotification.listen((notification) {
      _addNotification(
          '🚗 Trip ${notification.status}: ${notification.message}');
    });

    notificationHandler.onTravelAlert.listen((alert) {
      _addNotification('⚠️ ${alert.type.toUpperCase()}: ${alert.message}');
    });

    notificationHandler.onTripConfirmation.listen((confirmation) {
      _addNotification('❓ Confirmation needed: ${confirmation.message}');
    });

    // Listen to combined stream for logging/analytics
    notificationHandler.onAllNotifications.listen((data) {
      debugPrint(
          '📊 All notifications stream: ${data['type']} at ${data['timestamp']}');
    });
  }

  void _addNotification(String message) {
    if (mounted) {
      setState(() {
        _notifications.insert(0, message);
        // Keep only last 50 notifications
        if (_notifications.length > 50) {
          _notifications = _notifications.take(50).toList();
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notification Demo'),
        actions: [
          IconButton(
            icon: const Icon(Icons.clear_all),
            onPressed: () {
              setState(() {
                _notifications.clear();
              });
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Connection status
          Consumer(
            builder: (context, ref, child) {
              final socketService = ref.watch(socketServiceProvider);
              return Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                color: socketService.isConnected ? Colors.green : Colors.red,
                child: Text(
                  socketService.isConnected ? '✅ Connected' : '❌ Disconnected',
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
              );
            },
          ),

          // Notification types legend
          Container(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Notification Types:',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text('📧 General notifications'),
                const Text('🚗 Trip status updates'),
                const Text('⚠️ Travel alerts'),
                const Text('❓ Confirmation requests'),
                const SizedBox(height: 8),
                Text('Total received: ${_notifications.length}'),
              ],
            ),
          ),

          const Divider(),

          // Notifications list
          Expanded(
            child: _notifications.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.notifications_none,
                            size: 64, color: Colors.grey),
                        SizedBox(height: 16),
                        Text('Waiting for notifications...',
                            style: TextStyle(color: Colors.grey)),
                        SizedBox(height: 8),
                        Text(
                            'Send a message or trigger an action to see notifications appear here.'),
                      ],
                    ),
                  )
                : ListView.builder(
                    itemCount: _notifications.length,
                    itemBuilder: (context, index) {
                      final notification = _notifications[index];
                      return ListTile(
                        dense: true,
                        leading: CircleAvatar(
                          radius: 16,
                          backgroundColor: _getNotificationColor(notification),
                          child: Text('${index + 1}',
                              style: const TextStyle(fontSize: 12)),
                        ),
                        title: Text(notification),
                        subtitle: Text(DateTime.now().toString().split('.')[0]),
                        onTap: () {
                          // Handle notification tap
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Tapped: $notification')),
                          );
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Color _getNotificationColor(String notification) {
    if (notification.startsWith('📧')) return Colors.blue;
    if (notification.startsWith('🚗')) return Colors.green;
    if (notification.startsWith('⚠️')) return Colors.orange;
    if (notification.startsWith('❓')) return Colors.purple;
    return Colors.grey;
  }
}

/// Usage in main.dart or app initialization:
/// 
/// ```dart
/// void main() {
///   runApp(
///     ProviderScope(
///       child: MyApp(),
///     ),
///   );
/// }
/// 
/// class MyApp extends ConsumerWidget {
///   @override
///   Widget build(BuildContext context, WidgetRef ref) {
///     // Initialize notification handler at app startup
///     WidgetsBinding.instance.addPostFrameCallback((_) {
///       ref.read(notificationHandlerProvider).initialize();
///     });
/// 
///     return MaterialApp(
///       home: NotificationDemoScreen(),
///     );
///   }
/// }
/// ```