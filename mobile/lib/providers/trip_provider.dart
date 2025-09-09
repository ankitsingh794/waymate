// lib/providers/trip_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/models/trip_models.dart';
import 'package:mobile/services/trip_service.dart';

// --- State Definitions ---

/// Represents the state for the paginated list of trips.
class TripListState {
  final List<Trip> trips;
  final bool isLoading;
  final bool hasMore;
  final int page;
  final String? error;

  TripListState({
    this.trips = const [],
    this.isLoading = false,
    this.hasMore = true,
    this.page = 1,
    this.error,
  });

  TripListState copyWith({
    List<Trip>? trips,
    bool? isLoading,
    bool? hasMore,
    int? page,
    String? error,
  }) {
    return TripListState(
      trips: trips ?? this.trips,
      isLoading: isLoading ?? this.isLoading,
      hasMore: hasMore ?? this.hasMore,
      page: page ?? this.page,
      error: error ?? this.error,
    );
  }
}

// --- Notifier for the Trip List ---

/// Manages the state of the trip list, handling pagination and updates.
class TripListNotifier extends StateNotifier<TripListState> {
  final TripService _tripService;

  TripListNotifier(this._tripService) : super(TripListState()) {
    fetchInitialTrips();
  }

  Future<void> fetchInitialTrips() async {
    state = TripListState(isLoading: true, hasMore: true, page: 1);
    try {
      final paginatedResponse = await _tripService.getAllTrips(page: 1);
      state = state.copyWith(
        trips: paginatedResponse.trips,
        isLoading: false,
        hasMore: paginatedResponse.page < paginatedResponse.totalPages,
        page: 1,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, hasMore: false, error: e.toString());
    }
  }

  Future<void> fetchMoreTrips() async {
    if (state.isLoading || !state.hasMore) return;

    state = state.copyWith(isLoading: true);
    final nextPage = state.page + 1;

    try {
      final paginatedResponse = await _tripService.getAllTrips(page: nextPage);
      state = state.copyWith(
        trips: [...state.trips, ...paginatedResponse.trips],
        page: nextPage,
        hasMore: paginatedResponse.page < paginatedResponse.totalPages,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Refreshes the trip list, commonly used for pull-to-refresh.
  Future<void> refresh() async {
    await fetchInitialTrips();
  }

  /// Deletes a trip and instantly removes it from the local state for a snappy UI response.
  Future<void> deleteTrip(String tripId) async {
    // Instantly remove from the UI
    state = state.copyWith(
      trips: state.trips.where((trip) => trip.id != tripId).toList(),
    );
    try {
      // Make the API call in the background
      await _tripService.deleteTrip(tripId);
    } catch (e) {
      // If the API call fails, refresh the list to bring the item back
      refresh();
      // Optionally, show an error message to the user
    }
  }
}

// --- Riverpod Providers ---

/// Provider for the TripService instance.
/// This makes the service available to other providers in a testable way.
final tripServiceProvider = Provider<TripService>((ref) {
  return TripService();
});

/// Provider for the TripListNotifier.
/// The UI will watch this provider to get the list of trips and its state.
final tripListProvider = StateNotifierProvider<TripListNotifier, TripListState>((ref) {
  final tripService = ref.watch(tripServiceProvider);
  return TripListNotifier(tripService);
});

/// Provider for fetching the details of a SINGLE trip.
/// Using `.family` allows us to pass the tripId.
/// `autoDispose` cleans up the state when the screen is closed, saving memory.
final tripDetailsProvider = FutureProvider.autoDispose.family<Trip, String>((ref, tripId) {
  final tripService = ref.watch(tripServiceProvider);
  return tripService.getTripById(tripId);
});