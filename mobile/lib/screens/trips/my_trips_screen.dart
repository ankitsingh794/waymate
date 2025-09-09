// lib/screens/trips/my_trips_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/screens/chat/ai_trip_creation_screen.dart';
import 'package:mobile/services/notification_service.dart';
import 'package:mobile/widgets/trip_summary_card.dart';

class MyTripsScreen extends StatefulWidget {
  final VoidCallback navigateToProfile;
  const MyTripsScreen({super.key, required this.navigateToProfile});

  @override
  State<MyTripsScreen> createState() => _MyTripsScreenState();
}

class _MyTripsScreenState extends State<MyTripsScreen>
    with SingleTickerProviderStateMixin {
  // --- FIX: Declare the TabController here ---
  late TabController _tabController;

  // In a real app, this data would come from your backend API
  final List<Map<String, dynamic>> _allTrips = [
    {
      "id": "1",
      "destinationName": "Kyoto, Japan",
      "dates": {
        "start": "2025-10-20T00:00:00.000Z",
        "end": "2025-10-28T00:00:00.000Z"
      },
      "highlights": [
        "Arashiyama Bamboo Grove",
        "Fushimi Inari Shrine",
        "Gion District"
      ],
      "coverImage":
          "https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=2070&auto=format&fit=crop",
      "status": "upcoming",
    },
    {
      "id": "2",
      "destinationName": "Rome, Italy",
      "dates": {
        "start": "2025-08-30T00:00:00.000Z",
        "end": "2025-09-05T00:00:00.000Z"
      },
      "highlights": ["Colosseum", "Trevi Fountain", "Vatican City"],
      "coverImage":
          "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1996&auto=format&fit=crop",
      "status": "ongoing",
    },
    {
      "id": "3",
      "destinationName": "Cairo, Egypt",
      "dates": {
        "start": "2025-04-15T00:00:00.000Z",
        "end": "2025-04-22T00:00:00.000Z"
      },
      "highlights": [
        "Pyramids of Giza",
        "Khan el-Khalili",
        "Nile River Cruise"
      ],
      "coverImage":
          "https://images.unsplash.com/photo-1569056466998-c18728d1f887?q=80&w=1934&auto=format&fit=crop",
      "status": "past",
    }
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade100, // A light background for the cards
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
        title: Text('Hello, Ankit!',
            style: GoogleFonts.poppins(
                color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline, color: Colors.white),
            onPressed: () {
              NotificationService().showStopPurposeConfirmation();
              NotificationService().showTransportConfirmation();
            },
          ),
          IconButton(
            icon: const Icon(Icons.person_outline, color: Colors.white),
            onPressed: widget.navigateToProfile,
          ),
        ],
        // The TabBar for switching between trip lists
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle: GoogleFonts.poppins(fontWeight: FontWeight.bold),
          unselectedLabelStyle: GoogleFonts.poppins(),
          tabs: const [
            Tab(text: 'Upcoming'),
            Tab(text: 'Ongoing'),
            Tab(text: 'Past'),
          ],
        ),
      ),
      // The TabBarView displays the content for each tab
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildTripList(
              _allTrips.where((t) => t['status'] == 'upcoming').toList(),
              "No upcoming trips. Time for an adventure!"),
          _buildTripList(
              _allTrips.where((t) => t['status'] == 'ongoing').toList(),
              "No trips currently in progress."),
          _buildTripList(_allTrips.where((t) => t['status'] == 'past').toList(),
              "No trip history yet."),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(
                builder: (context) => const AiTripCreationScreen()),
          );
        },
        child: Ink(
          decoration: const ShapeDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color.fromARGB(255, 87, 184, 203),
                Color.fromARGB(255, 14, 59, 76)
              ],
            ),
            shape: CircleBorder(),
          ),
          child: const Center(child: Icon(Icons.add, color: Colors.white)),
        ),
      ),
    );
  }

  // A helper widget to build the list for each tab
  Widget _buildTripList(List<Map<String, dynamic>> trips, String emptyMessage) {
    if (trips.isEmpty) {
      return Center(
        child: Text(emptyMessage,
            style: GoogleFonts.poppins(color: Colors.black54, fontSize: 16)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(8.0), // Added padding for better spacing
      itemCount: trips.length,
      itemBuilder: (context, index) {
        return TripSummaryCard(tripData: trips[index]);
      },
    );
  }
}