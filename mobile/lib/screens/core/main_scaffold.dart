// lib/screens/core/main_scaffold.dart

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/providers.dart';
import 'package:mobile/screens/notifications/notifications_screen.dart';
import 'package:mobile/screens/profile/profile_screen.dart';
import 'package:mobile/screens/trips/my_trips_screen.dart';
import 'package:mobile/widgets/tracking_nudge_card.dart';

// --- UPDATED: Converted to a ConsumerStatefulWidget to use Riverpod ---
class MainScaffold extends ConsumerStatefulWidget {
  const MainScaffold({super.key});

  @override
  ConsumerState<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends ConsumerState<MainScaffold> {
  int _selectedIndex = 0;
  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();

    // --- NEW: Initialize global services when the user is logged in ---
    // This is the perfect place to start services that should only run
    // when a user is authenticated.
    final notificationService = ref.read(notificationServiceProvider);
    notificationService.initialize();

    // In a real app, you would check a persisted user setting for this consent.
    // For now, we assume consent is given and start the tracking manager.
    _initializePassiveTracking();

    // Initialize pages
    _pages = <Widget>[
      MyTripsScreen(navigateToProfile: () => _onItemTapped(2)),
      const NotificationsScreen(),
      const ProfileScreen(),
    ];
  }

  Future<void> _initializePassiveTracking() async {
    final passiveTrackingManager = ref.read(passiveTrackingManagerProvider);
    bool started = await passiveTrackingManager.start();
    if (!started) {
      debugPrint("⚠️ Failed to start passive tracking - check permissions");
    }
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    // Watch the notification provider to get the latest instance
    final notificationService = ref.watch(notificationServiceProvider);

    return Scaffold(
      // --- UPDATED: Use a Stack to overlay the nudge card ---
      body: Stack(
        children: [
          // Use an IndexedStack to preserve the state of each page
          IndexedStack(
            index: _selectedIndex,
            children: _pages,
          ),
          // The nudge card will appear on top of any screen when an event is fired
          const SafeArea(
            child: Align(
              alignment: Alignment.topCenter,
              child: TrackingNudgeCard(),
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        items: <BottomNavigationBarItem>[
          const BottomNavigationBarItem(
            icon: Icon(Icons.explore_outlined),
            activeIcon: Icon(Icons.explore),
            label: 'My Trips',
          ),
          BottomNavigationBarItem(
            icon: ValueListenableBuilder<int>(
              // --- NEW: Listen to the unreadCount to show a badge ---
              valueListenable: notificationService.unreadCount,
              builder: (context, count, child) {
                return Badge(
                  label: Text('$count'),
                  isLabelVisible: count > 0,
                  child: child!,
                );
              },
              child: const Icon(Icons.notifications_outlined),
            ),
            activeIcon: const Icon(Icons.notifications),
            label: 'Notifications',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
      ),
    );
  }
}
