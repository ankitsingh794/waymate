// lib/data/trip_repository.dart

import 'package:isar/isar.dart';
import 'package:mobile/models/trip_models.dart';
import 'package:mobile/services/api_client.dart';
import 'package:mobile/services/trip_service.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

class TripRepository {
  final Isar isar;
  final TripService tripService;
  final Connectivity connectivity;

  TripRepository({
    required this.isar,
    required this.tripService,
    required this.connectivity,
  });

  /// Gets trips, prioritizing fresh data from API but falling back to local DB.
  Future<List<Trip>> getTrips({String? status}) async {
    final connectivityResult = await connectivity.checkConnectivity();
    final isOnline = connectivityResult != ConnectivityResult.none;

    if (isOnline) {
      try {
        final paginatedResponse = await tripService.getAllTrips(status: status, limit: 100);
        // Save fresh data to the local DB for offline access
        await isar.writeTxn(() async {
          await isar.trips.putAll(paginatedResponse.trips);
        });
        return paginatedResponse.trips;
      } on ApiException {
        // If API fails, fall back to local data
        return isar.trips.where().findAll();
      }
    } else {
      // If offline, get data from the local DB
      return isar.trips.where().findAll();
    }
  }

  /// Updates a trip, saving locally if the user is offline.
  Future<Trip> updateTripDetails(Trip tripToUpdate, Map<String, dynamic> details) async {
    final connectivityResult = await connectivity.checkConnectivity();
    final isOnline = connectivityResult != ConnectivityResult.none;

    if (isOnline) {
      final updatedTrip = await tripService.updateTripDetails(tripToUpdate.id, details);
      // Update the local DB with the confirmed server version
      await isar.writeTxn(() async {
        await isar.trips.put(updatedTrip);
      });
      return updatedTrip;
    } else {
      // Offline: Apply changes locally and mark for syncing
      final offlineTrip = tripToUpdate.copyWith(
        destination: details['destination'],
        startDate: DateTime.parse(details['startDate']),
        endDate: DateTime.parse(details['endDate']),
        needsSync: true, // Mark for sync
      );
      await isar.writeTxn(() async {
        await isar.trips.put(offlineTrip);
      });
      return offlineTrip;
    }
  }
  
  // You would add similar repository methods for getTripById, deleteTrip, etc.
}