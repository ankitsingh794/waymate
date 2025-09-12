// lib/screens/trips/my_trips_screen.dart

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/trip_models.dart';
import 'package:mobile/screens/chat/ai_trip_creation_screen.dart';
import 'package:mobile/services/trip_service.dart';
import 'package:mobile/widgets/trip_summary_card.dart';

class MyTripsScreen extends StatefulWidget {
  final VoidCallback navigateToProfile;
  const MyTripsScreen({super.key, required this.navigateToProfile});

  @override
  State<MyTripsScreen> createState() => _MyTripsScreenState();
}

class _MyTripsScreenState extends State<MyTripsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TripService _tripService = TripService();

  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _searchController.addListener(_onSearchChanged);
  }

  void _onSearchChanged() {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      if (mounted) {
        setState(() {
          _searchQuery = _searchController.text;
        });
      }
    });
  }

  Future<List<Trip>> _fetchTrips(String status) async {
    try {
      final paginatedResponse = await _tripService.getAllTrips(
        status: status,
        destination: _searchQuery.isNotEmpty ? _searchQuery : null,
        limit: 100,
      );
      return paginatedResponse.trips;
    } catch (e) {
      debugPrint('Failed to load $status trips: $e');
      rethrow;
    }
  }

  final Map<int, Key> _tabKeys = {
    0: UniqueKey(),
    1: UniqueKey(),
    2: UniqueKey()
  };

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
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
        title: Text('My Trips',
            style: GoogleFonts.poppins(
                fontWeight: FontWeight.bold, color: Colors.white)),
        actions: [
          // --- FIXED: Removed the temporary/unused "Help" button ---
          IconButton(
            icon: const Icon(Icons.person_outline, color: Colors.white),
            onPressed: widget.navigateToProfile,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(100.0),
          child: Column(
            mainAxisAlignment:
                MainAxisAlignment.end, // Align children to the bottom
            children: [
              // Add some vertical padding for better spacing
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search by destination...',
                    prefixIcon: const Icon(Icons.search, color: Colors.white70),
                    hintStyle: const TextStyle(color: Colors.white70),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.2),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(30.0),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding:
                        EdgeInsets.zero, // Adjust padding for a tighter look
                  ),
                  style: const TextStyle(color: Colors.white),
                ),
              ),

              // --- NEW: Wrap the TabBar in a Container for a distinct background ---
              Container(
                // A subtle background color to visually separate the tabs
                color: Colors.black.withOpacity(0.2),
                child: TabBar(
                  controller: _tabController,
                  indicatorColor: Colors.white,
                  labelColor: Colors.white,
                  unselectedLabelColor:
                      Colors.white70, // Add for better unselected state
                  tabs: const [
                    Tab(text: 'PLANNED'),
                    Tab(text: 'ONGOING'),
                    Tab(text: 'COMPLETED')
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildTripList(
              _fetchTrips('planned'), "No planned trips found.", _tabKeys[0]!),
          _buildTripList(
              _fetchTrips('ongoing'), "No ongoing trips.", _tabKeys[1]!),
          _buildTripList(_fetchTrips('completed'),
              "No completed trips in your history.", _tabKeys[2]!),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.of(context).push(MaterialPageRoute(
              builder: (context) => const AiTripCreationScreen()));
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildTripList(
      Future<List<Trip>> future, String emptyMessage, Key key) {
    return FutureBuilder<List<Trip>>(
      key: key,
      future: future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
              child: Text('Failed to load trips.',
                  style: GoogleFonts.poppins(color: Colors.red.shade700)));
        }
        final trips = snapshot.data ?? [];
        if (trips.isEmpty) {
          return Center(
              child:
                  Text(emptyMessage, style: GoogleFonts.poppins(fontSize: 16)));
        }

        return RefreshIndicator(
          onRefresh: () async {
            setState(() {
              // This rebuilds the FutureBuilder with a new key, forcing a refetch
              _tabKeys[_tabController.index] = UniqueKey();
            });
          },
          child: ListView.builder(
            padding: const EdgeInsets.all(8.0),
            itemCount: trips.length,
            itemBuilder: (context, index) {
              final trip = trips[index];
              return TripSummaryCard(tripData: trip);
            },
          ),
        );
      },
    );
  }
}
