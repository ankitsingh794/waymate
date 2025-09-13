// lib/screens/places/find_places_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/place_models.dart';
import 'package:mobile/services/places_service.dart';
import 'package:mobile/services/permission_service.dart';
import 'package:mobile/widgets/place_result_card.dart';
import 'package:geolocator/geolocator.dart';

class FindPlacesScreen extends StatefulWidget {
  const FindPlacesScreen({super.key});

  @override
  State<FindPlacesScreen> createState() => _FindPlacesScreenState();
}

class _FindPlacesScreenState extends State<FindPlacesScreen> {
  // --- NEW: State management for API calls and results ---
  final PlacesService _placesService = PlacesService();
  final TextEditingController _searchController = TextEditingController();
  Future<List<Place>>? _searchFuture;
  String _currentQuery = '';

  // --- NEW: Method to trigger the API search ---
  void _performSearch(String query, {Position? position}) {
    if (query.trim().isEmpty) return;

    setState(() {
      _currentQuery = query;
      _searchFuture = _placesService.findPlaces(
        query: query,
        latitude: position?.latitude,
        longitude: position?.longitude,
      );
    });
  }

  // --- NEW: Method to get current location and trigger a search ---
  Future<void> _searchNearMe() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw Exception('Location services are disabled.');
      }

      bool hasLocation = await PermissionService.hasLocationPermission();
      if (!hasLocation) {
        throw Exception(
            'Location permissions are denied. Please grant location permission in app settings.');
      }

      final position = await Geolocator.getCurrentPosition();
      _performSearch(_searchController.text, position: position);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Find Places', style: GoogleFonts.poppins()),
      ),
      body: Column(
        children: [
          _buildSearchBar(),
          Expanded(
            // --- UPDATED: Use a FutureBuilder to handle different states ---
            child: FutureBuilder<List<Place>>(
              future: _searchFuture,
              builder: (context, snapshot) {
                // Initial state before any search
                if (_searchFuture == null) {
                  return const Center(
                      child: Text('Search for places to begin.'));
                }
                // Loading state
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                // Error state
                if (snapshot.hasError) {
                  return Center(child: Text('Error: ${snapshot.error}'));
                }
                // Empty result state
                final places = snapshot.data ?? [];
                if (places.isEmpty) {
                  return Center(
                      child: Text("No results found for '$_currentQuery'"));
                }
                // Success state with data
                return ListView.builder(
                  itemCount: places.length,
                  itemBuilder: (context, index) {
                    return PlaceResultCard(placeData: places[index]);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'e.g., "restaurants in Jamshedpur"',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(30.0),
                ),
              ),
              onSubmitted: _performSearch,
            ),
          ),
          // --- NEW: "Near Me" button ---
          IconButton(
            icon: const Icon(Icons.my_location),
            onPressed: _searchNearMe,
            tooltip: 'Search Near Me',
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }
}
